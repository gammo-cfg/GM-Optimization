use crate::db::Database;
use crate::models::ExclusionEntry;
use chrono::Local;
use tauri::State;

#[tauri::command]
pub async fn get_exclusions(db: State<'_, Database>) -> Result<Vec<ExclusionEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, path, added_at FROM exclusion_list ORDER BY path")
        .map_err(|e| e.to_string())?;
    let entries = stmt
        .query_map([], |row| {
            Ok(ExclusionEntry {
                id: row.get(0)?,
                path: row.get(1)?,
                added_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(entries)
}

#[tauri::command]
pub async fn add_exclusion(db: State<'_, Database>, path: String) -> Result<ExclusionEntry, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO exclusion_list (path, added_at) VALUES (?1, ?2)",
        rusqlite::params![path, now],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(ExclusionEntry { id, path, added_at: now })
}

#[tauri::command]
pub async fn remove_exclusion(db: State<'_, Database>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM exclusion_list WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
