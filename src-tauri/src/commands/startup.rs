use crate::models::StartupItem;
use crate::util::{cmd, powershell};
use serde_json::Value;
use std::fs;

fn normalize_registry_path(path: &str) -> String {
    path.replace("HKCU:\\", "HKCU\\").replace("HKLM:\\", "HKLM\\")
}

fn allowed_registry_path(path: &str) -> bool {
    matches!(
        path.to_ascii_uppercase().as_str(),
        r"HKCU\SOFTWARE\MICROSOFT\WINDOWS\CURRENTVERSION\RUN"
            | r"HKLM\SOFTWARE\MICROSOFT\WINDOWS\CURRENTVERSION\RUN"
    )
}

fn allowed_startup_folder(path: &std::path::Path) -> bool {
    let mut allowed = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        allowed.push(std::path::PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup"));
    }
    if let Ok(programdata) = std::env::var("PROGRAMDATA") {
        allowed.push(std::path::PathBuf::from(programdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup"));
    }
    allowed.iter().any(|candidate| candidate == path)
}

fn scan_registry(path: &str, label: &str) -> Vec<StartupItem> {
    let safe_path = path.replace('"', "`");
    let safe_label = label.replace('"', "`");
    let script = format!(
        r#"$items = @(); try {{
            $p = Get-ItemProperty "{safe_path}" -ErrorAction Stop;
            $p.PSObject.Properties | Where-Object {{ $_.Name -notlike 'PS*' }} | ForEach-Object {{
                $name = $_.Name; $val = [string]$_.Value; $disabled = $name.StartsWith('_disabled_');
                if ($disabled) {{ $name = $name.Substring(10) }};
                $items += [pscustomobject]@{{ id = "registry|{safe_path}|$name"; name = $name; command = $val; location = "{safe_label}"; enabled = !$disabled }}
            }}
        }} catch {{}}; @($items) | ConvertTo-Json -Compression"#
    );
    let Ok(output) = powershell(&script) else { return Vec::new(); };
    if !output.status.success() { return Vec::new(); }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() || text == "[]" { return Vec::new(); }
    let Ok(value) = serde_json::from_str::<Value>(&text) else { return Vec::new(); };
    match value {
        Value::Array(items) => items.into_iter().filter_map(|v| serde_json::from_value(v).ok()).collect(),
        Value::Object(_) => serde_json::from_value(value).ok().into_iter().collect(),
        _ => Vec::new(),
    }
}

fn scan_folder(path: &str, label: &str) -> Vec<StartupItem> {
    let mut items = Vec::new();
    let disabled_path = format!(r"{}\Disabled", path);
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().is_some_and(|e| e.eq_ignore_ascii_case("lnk") || e.eq_ignore_ascii_case("url")) {
                let filename = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                items.push(StartupItem {
                    id: format!("folder|{path}|{filename}"),
                    name: p.file_stem().unwrap_or_default().to_string_lossy().to_string(),
                    command: p.to_string_lossy().to_string(), location: label.to_string(), enabled: true,
                });
            }
        }
    }
    if let Ok(entries) = fs::read_dir(&disabled_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().is_some_and(|e| e.eq_ignore_ascii_case("lnk") || e.eq_ignore_ascii_case("url")) {
                let stem = p.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let clean = stem.strip_prefix("_disabled_").unwrap_or(&stem).to_string();
                let ext = p.extension().unwrap_or_default().to_string_lossy();
                let original = format!("{clean}.{ext}");
                items.push(StartupItem {
                    id: format!("folder|{path}|{original}"), name: clean,
                    command: p.to_string_lossy().to_string(), location: label.to_string(), enabled: false,
                });
            }
        }
    }
    items
}

fn query_raw_value(path: &str, name: &str) -> Result<(String, String), String> {
    let output = cmd("reg").args(["query", path, "/v", name]).output().map_err(|e| e.to_string())?;
    if !output.status.success() { return Err("Startup registry value was not found".into()); }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let fields: Vec<&str> = line.split_whitespace().collect();
        if let Some(i) = fields.iter().position(|v| v.starts_with("REG_")) {
            if i + 1 < fields.len() { return Ok((fields[i].into(), fields[i + 1..].join(" "))); }
        }
    }
    Err("Could not parse startup registry value".into())
}

fn rename_registry_value(path: &str, from: &str, to: &str) -> Result<(), String> {
    let (kind, value) = query_raw_value(path, from)?;
    let add = cmd("reg").args(["add", path, "/v", to, "/t", &kind, "/d", &value, "/f"])
        .output().map_err(|e| e.to_string())?;
    if !add.status.success() { return Err(String::from_utf8_lossy(&add.stderr).trim().into()); }
    let delete = cmd("reg").args(["delete", path, "/v", from, "/f"])
        .output().map_err(|e| e.to_string())?;
    if !delete.status.success() {
        let _ = cmd("reg").args(["delete", path, "/v", to, "/f"]).output();
        return Err(String::from_utf8_lossy(&delete.stderr).trim().into());
    }
    Ok(())
}

#[tauri::command]
pub async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();
    items.extend(scan_registry(r"HKCU:\Software\Microsoft\Windows\CurrentVersion\Run", r"HKCU\Run"));
    items.extend(scan_registry(r"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run", r"HKLM\Run"));

    if let Ok(appdata) = std::env::var("APPDATA") {
        items.extend(scan_folder(&format!(r"{}\Microsoft\Windows\Start Menu\Programs\Startup", appdata), "Startup Folder (User)"));
    }
    if let Ok(programdata) = std::env::var("PROGRAMDATA") {
        items.extend(scan_folder(&format!(r"{}\Microsoft\Windows\Start Menu\Programs\Startup", programdata), "Startup Folder (All Users)"));
    }
    items.sort_by_key(|item| item.name.to_ascii_lowercase());
    items.dedup_by(|a, b| a.id == b.id);
    Ok(items)
}

#[tauri::command]
pub async fn toggle_startup_item(id: String, enabled: bool) -> Result<(), String> {
    let parts: Vec<&str> = id.splitn(3, '|').collect();
    if parts.len() != 3 { return Err("Invalid startup item id".into()); }
    match parts[0] {
        "registry" => {
            let path = normalize_registry_path(parts[1]);
            let name = parts[2];
            if !allowed_registry_path(&path) { return Err("Startup registry path is not allowed".into()); }
            if name.is_empty() || name.len() > 256 || name.contains('\0') || name.contains('\\') {
                return Err("Invalid startup item name".into());
            }
            if enabled {
                rename_registry_value(&path, &format!("_disabled_{name}"), name)
            } else {
                rename_registry_value(&path, name, &format!("_disabled_{name}"))
            }
        }
        "folder" => {
            let base = std::path::PathBuf::from(parts[1]);
            if !allowed_startup_folder(&base) { return Err("Startup folder is not allowed".into()); }
            let supplied = std::path::Path::new(parts[2]);
            let filename = supplied.file_name().ok_or("Invalid startup filename")?;
            if supplied.components().count() != 1 { return Err("Invalid startup filename".into()); }
            let source = base.join(filename);
            let disabled_dir = base.join("Disabled");
            let disabled = disabled_dir.join(filename);
            if enabled {
                fs::rename(disabled, source).map_err(|e| format!("Failed to enable startup item: {e}"))
            } else {
                fs::create_dir_all(&disabled_dir).map_err(|e| format!("Failed to create disabled startup folder: {e}"))?;
                fs::rename(source, disabled).map_err(|e| format!("Failed to disable startup item: {e}"))
            }
        }
        _ => Err("Unsupported startup item source".into()),
    }
}
