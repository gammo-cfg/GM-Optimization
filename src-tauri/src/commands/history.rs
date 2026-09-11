use crate::db::Database;
use crate::models::ScanHistoryEntry;
use chrono::Local;
use tauri::State;

#[tauri::command]
pub async fn get_scan_history(db: State<'_, Database>, limit: i64) -> Result<Vec<ScanHistoryEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, module, scanned_at, total_size, item_count, result_json FROM scan_history ORDER BY scanned_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let entries = stmt
        .query_map([limit], |row| {
            Ok(ScanHistoryEntry {
                id: row.get(0)?,
                module: row.get(1)?,
                scanned_at: row.get(2)?,
                total_size: row.get(3)?,
                item_count: row.get(4)?,
                result_json: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(entries)
}

#[tauri::command]
pub async fn clear_scan_history(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM scan_history", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_scan_result(db: &Database, module: &str, total_size: i64, item_count: i64, result_json: &str) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO scan_history (module, scanned_at, total_size, item_count, result_json) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![module, Local::now().to_rfc3339(), total_size, item_count, result_json],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
