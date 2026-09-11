use crate::db::Database;
use crate::models::Schedule;
use crate::util::cmd;
use chrono::Local;
use tauri::State;

fn task_name(name: &str) -> String {
    format!("GMOptimization-{}", name)
}

fn exe_path() -> String {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "gm-optimization.exe".into())
}

fn build_schtasks_args(
    tn: &str, module: &str, schedule_type: &str, time: &Option<String>, day: &Option<String>,
) -> Vec<String> {
    let mut args = vec![
        "/create".to_string(),
        "/tn".to_string(), tn.to_string(),
        "/tr".to_string(), format!("\"{}\" --silent --task {}", exe_path(), module),
        "/sc".to_string(), schedule_type.to_string(),
        "/ru".to_string(), "SYSTEM".to_string(),
        "/f".to_string(),
    ];
    if let Some(t) = time {
        args.push("/st".to_string());
        args.push(t.clone());
    }
    if let Some(d) = day {
        args.push("/d".to_string());
        args.push(d.clone());
    }
    args
}


fn valid_schedule_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '_' | '-'))
}

fn validate_schedule(module: &str, schedule_type: &str, time: &Option<String>, day: &Option<String>) -> Result<(), String> {
    if module != "junk_cleaner" {
        return Err("Unsupported scheduled module".into());
    }
    let schedule = schedule_type.to_ascii_uppercase();
    if !matches!(schedule.as_str(), "DAILY" | "WEEKLY" | "ONCE") {
        return Err("Unsupported schedule type".into());
    }
    if let Some(value) = time {
        let parts: Vec<&str> = value.split(':').collect();
        if parts.len() != 2
            || parts[0].parse::<u8>().map_or(true, |h| h > 23)
            || parts[1].parse::<u8>().map_or(true, |m| m > 59)
        {
            return Err("Time must use HH:MM (24-hour) format".into());
        }
    }
    if let Some(value) = day {
        let normalized = value.to_ascii_uppercase();
        if !matches!(normalized.as_str(), "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN") {
            return Err("Invalid schedule day".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_schedules(db: State<'_, Database>) -> Result<Vec<Schedule>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, module, schedule_type, time, day, enabled, created_at FROM schedules ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Schedule {
                id: row.get(0)?,
                name: row.get(1)?,
                module: row.get(2)?,
                schedule_type: row.get(3)?,
                time: row.get(4)?,
                day: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub async fn create_schedule(
    db: State<'_, Database>, name: String, module: String,
    schedule_type: String, time: Option<String>, day: Option<String>,
) -> Result<Schedule, String> {
    if !valid_schedule_name(&name) { return Err("Invalid schedule name".into()); }
    validate_schedule(&module, &schedule_type, &time, &day)?;
    let tn = task_name(&name);
    let args = build_schtasks_args(&tn, &module, &schedule_type, &time, &day);
    let output = cmd("schtasks")
        .args(&args)
        .output()
        .map_err(|e| format!("schtasks failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to create scheduled task: {}", stderr.trim()));
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO schedules (name, module, schedule_type, time, day, enabled, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
        rusqlite::params![name, module, schedule_type, time, day, now],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(Schedule { id, name, module, schedule_type, time, day, enabled: true, created_at: now })
}

#[tauri::command]
pub async fn delete_schedule(db: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let name: String = conn
        .query_row("SELECT name FROM schedules WHERE id = ?1", [id], |row| row.get(0))
        .map_err(|_| format!("Schedule not found: {}", id))?;
    let tn = task_name(&name);
    let output = cmd("schtasks")
        .args(["/delete", "/tn", &tn, "/f"])
        .output()
        .map_err(|e| format!("schtasks failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to delete scheduled task: {}", stderr.trim()));
    }
    conn.execute("DELETE FROM schedules WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_schedule(db: State<'_, Database>, id: i64, enabled: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let name: String = conn
        .query_row("SELECT name FROM schedules WHERE id = ?1", [id], |row| row.get(0))
        .map_err(|_| format!("Schedule not found: {}", id))?;
    let tn = task_name(&name);
    let flag = if enabled { "/enable" } else { "/disable" };
    let output = cmd("schtasks")
        .args(["/change", "/tn", &tn, flag])
        .output()
        .map_err(|e| format!("schtasks failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to toggle scheduled task: {}", stderr.trim()));
    }
    conn.execute(
        "UPDATE schedules SET enabled = ?1 WHERE id = ?2",
        rusqlite::params![enabled, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
