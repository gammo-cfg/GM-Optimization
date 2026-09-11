use crate::db::Database;
use crate::models::TweakState;
use crate::util::{cmd, powershell};
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistryEntry {
    pub path: String,
    pub name: String,
    pub value: String,
    pub type_: String,
}

fn valid_registry_path(path: &str) -> bool {
    ["HKCU\\", "HKLM\\", "HKU\\", "HKEY_CURRENT_USER\\", "HKEY_LOCAL_MACHINE\\", "HKEY_USERS\\"]
        .iter().any(|prefix| path.starts_with(prefix))
        && path.len() <= 512
        && !path.contains('\0')
}

fn registry_type(input: &str) -> Result<&'static str, String> {
    match input.to_ascii_lowercase().as_str() {
        "dword" | "reg_dword" => Ok("REG_DWORD"),
        "string" | "sz" | "reg_sz" => Ok("REG_SZ"),
        "expand" | "reg_expand_sz" => Ok("REG_EXPAND_SZ"),
        "multi" | "reg_multi_sz" => Ok("REG_MULTI_SZ"),
        "qword" | "reg_qword" => Ok("REG_QWORD"),
        "binary" | "reg_binary" => Ok("REG_BINARY"),
        other => Err(format!("Unsupported registry type: {other}")),
    }
}

fn query_registry_value(path: &str, name: &str) -> Result<Option<(String, String)>, String> {
    let output = cmd("reg")
        .args(["query", path, "/v", name])
        .output()
        .map_err(|e| format!("Failed to query registry value: {e}"))?;
    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if let Some(type_index) = parts.iter().position(|part| part.starts_with("REG_")) {
            if type_index + 1 < parts.len() {
                return Ok(Some((parts[type_index].to_string(), parts[type_index + 1..].join(" "))));
            }
        }
    }
    Ok(None)
}

fn backup_registry_value(db: &Database, entry: &RegistryEntry) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM registry_value_backups WHERE path = ?1 AND name = ?2)",
        rusqlite::params![entry.path, entry.name],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    if exists {
        return Ok(());
    }
    drop(conn);

    let current = query_registry_value(&entry.path, &entry.name)?;
    let (existed, value_type, value) = match current {
        Some((kind, value)) => (1, Some(kind), Some(value)),
        None => (0, None, None),
    };
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO registry_value_backups (path, name, existed, value_type, value, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![entry.path, entry.name, existed, value_type, value, Local::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn restore_registry_value(db: &Database, entry: &RegistryEntry) -> Result<String, String> {
    let backup = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT existed, value_type, value FROM registry_value_backups WHERE path = ?1 AND name = ?2",
            rusqlite::params![entry.path, entry.name],
            |row| Ok((row.get::<_, i32>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, Option<String>>(2)?)),
        ).ok()
    };

    let output = match backup.as_ref() {
        Some((1, Some(value_type), Some(value))) => cmd("reg")
            .args(["add", &entry.path, "/v", &entry.name, "/t", value_type, "/d", value, "/f"])
            .output(),
        _ => cmd("reg").args(["delete", &entry.path, "/v", &entry.name, "/f"]).output(),
    }.map_err(|e| format!("Failed to restore registry value: {e}"))?;

    // A delete can return an error when the value did not exist originally and is already absent.
    if !output.status.success() && !matches!(backup, Some((0, _, _))) {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM registry_value_backups WHERE path = ?1 AND name = ?2",
        rusqlite::params![entry.path, entry.name],
    ).map_err(|e| e.to_string())?;
    Ok(format!("Restored {}", entry.name))
}

#[tauri::command]
pub async fn apply_registry_tweak(db: State<'_, Database>, entries: Vec<RegistryEntry>, enabled: bool) -> Result<String, String> {
    if entries.is_empty() || entries.len() > 100 {
        return Err("Registry tweak must contain between 1 and 100 values".into());
    }
    let mut results = Vec::new();

    for entry in &entries {
        if !valid_registry_path(&entry.path) || entry.name.is_empty() || entry.name.len() > 256 || entry.value.len() > 4096 {
            return Err("Invalid registry tweak input".into());
        }
        if enabled {
            backup_registry_value(&db, entry)?;
            let type_flag = registry_type(&entry.type_)?;
            let output = cmd("reg")
                .args(["add", &entry.path, "/v", &entry.name, "/t", type_flag, "/d", &entry.value, "/f"])
                .output()
                .map_err(|e| format!("Failed to execute reg.exe: {e}"))?;
            if !output.status.success() {
                return Err(format!("Failed to set {}: {}", entry.name, String::from_utf8_lossy(&output.stderr).trim()));
            }
            results.push(format!("Set {}", entry.name));
        } else {
            results.push(restore_registry_value(&db, entry)?);
        }
    }
    Ok(results.join("\n"))
}

#[tauri::command]
pub async fn get_tweak_states(db: State<'_, Database>) -> Result<Vec<TweakState>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT tweak_key, enabled, requires_reboot, updated_at FROM tweak_settings ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let states: Vec<TweakState> = stmt
        .query_map([], |row| {
            Ok(TweakState {
                key: row.get(0)?,
                enabled: row.get::<_, i32>(1)? != 0,
                requires_reboot: row.get::<_, i32>(2)? != 0,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    Ok(states)
}

#[tauri::command]
pub async fn set_tweak_state(
    db: State<'_, Database>, key: String, enabled: bool, requires_reboot: bool,
) -> Result<(), String> {
    if key.is_empty() || key.len() > 128 || !key.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.')) {
        return Err("Invalid tweak key".into());
    }
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tweak_settings (tweak_key, enabled, requires_reboot, updated_at) VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT(tweak_key) DO UPDATE SET enabled = excluded.enabled, requires_reboot = excluded.requires_reboot, updated_at = excluded.updated_at",
        rusqlite::params![key, enabled, requires_reboot, Local::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn execute_powershell_tweak(
    enabled: bool, enable_script: Vec<String>, disable_script: Vec<String>,
) -> Result<String, String> {
    let script = if enabled { &enable_script } else { &disable_script };
    if script.is_empty() || script.len() > 40 || script.iter().any(|line| line.len() > 8_192 || line.contains('\0')) {
        return Err("Invalid PowerShell tweak payload".into());
    }
    let output = powershell(&script.join("; "))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!("PowerShell error: {}", String::from_utf8_lossy(&output.stderr).trim()))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceEntry {
    pub name: String,
    pub startup_type: String,
}

#[tauri::command]
pub async fn configure_services(entries: Vec<ServiceEntry>) -> Result<String, String> {
    if entries.is_empty() || entries.len() > 50 {
        return Err("Invalid service list".into());
    }
    let mut results = Vec::new();
    for entry in &entries {
        if entry.name.is_empty() || entry.name.len() > 128 || !entry.name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.')) {
            return Err(format!("Invalid service name: {}", entry.name));
        }
        let start_value = match entry.startup_type.to_ascii_lowercase().as_str() {
            "disabled" | "disable" => "disabled",
            "manual" => "demand",
            "auto" | "automatic" => "auto",
            "delayed" | "delayed-auto" => "delayed-auto",
            _ => return Err(format!("Unsupported startup type: {}", entry.startup_type)),
        };
        let output = cmd("sc").args(["config", &entry.name, "start=", start_value]).output()
            .map_err(|e| format!("Failed to configure service {}: {e}", entry.name))?;
        if !output.status.success() {
            return Err(format!("Failed to configure {}: {}", entry.name, String::from_utf8_lossy(&output.stderr).trim()));
        }
        results.push(format!("{} → {}", entry.name, start_value));
    }
    Ok(results.join("\n"))
}

fn split_command_line(command: &str) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    for ch in command.chars() {
        match ch {
            '"' => quoted = !quoted,
            ' ' | '\t' if !quoted => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(ch),
        }
    }
    if quoted { return Err("Unclosed quote in native command".into()); }
    if !current.is_empty() { args.push(current); }
    Ok(args)
}

#[tauri::command]
pub async fn execute_native_commands(commands: Vec<String>) -> Result<String, String> {
    const ALLOWED: &[&str] = &["cleanmgr.exe", "cleanmgr", "dism.exe", "dism", "powercfg.exe", "powercfg", "ipconfig.exe", "ipconfig", "netsh.exe", "netsh"];
    if commands.is_empty() || commands.len() > 20 {
        return Err("Invalid native command list".into());
    }
    let mut results = Vec::new();
    for command in &commands {
        if command.len() > 4096 || command.contains('\0') { return Err("Invalid native command".into()); }
        let parts = split_command_line(command)?;
        let Some(program) = parts.first() else { continue; };
        if !ALLOWED.iter().any(|allowed| program.eq_ignore_ascii_case(allowed)) {
            return Err(format!("Native command is not allowed: {program}"));
        }
        let output = cmd(program).args(&parts[1..]).output().map_err(|e| format!("Failed to execute {program}: {e}"))?;
        if !output.status.success() {
            return Err(format!("{program} failed: {}", String::from_utf8_lossy(&output.stderr).trim()));
        }
        results.push(format!("{program} completed"));
    }
    Ok(results.join("\n"))
}

#[tauri::command]
pub async fn read_registry_values(entries: Vec<String>) -> Result<Vec<(String, bool)>, String> {
    if entries.len() > 100 { return Err("Too many registry reads".into()); }
    let mut results = Vec::new();
    for entry in &entries {
        let parts: Vec<&str> = entry.splitn(3, '|').collect();
        if parts.len() != 3 || !valid_registry_path(parts[0]) {
            results.push((entry.clone(), false));
            continue;
        }
        let matches = query_registry_value(parts[0], parts[1])?
            .map(|(_, value)| {
                let normalized = value.strip_prefix("0x").and_then(|hex| u64::from_str_radix(hex, 16).ok()).map(|v| v.to_string()).unwrap_or(value);
                normalized.eq_ignore_ascii_case(parts[2])
            }).unwrap_or(false);
        results.push((entry.clone(), matches));
    }
    Ok(results)
}

#[tauri::command]
pub async fn shutdown_system() -> Result<String, String> {
    let output = cmd("shutdown").args(["/r", "/t", "0", "/f"]).output()
        .map_err(|e| format!("Failed to request restart: {e}"))?;
    if output.status.success() { Ok("Restarting…".into()) }
    else { Err(String::from_utf8_lossy(&output.stderr).trim().to_string()) }
}
