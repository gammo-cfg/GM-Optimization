use rusqlite::{Connection, Result};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

pub struct Database {
    pub conn: Mutex<Connection>,
}

fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let names = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for name in names {
        if name?.eq_ignore_ascii_case(column) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY, module TEXT NOT NULL,
            scanned_at TEXT NOT NULL, total_size INTEGER,
            item_count INTEGER, result_json TEXT
        );
        CREATE TABLE IF NOT EXISTS exclusion_list (
            id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE,
            added_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS registry_backups (
            id INTEGER PRIMARY KEY, file_path TEXT NOT NULL,
            key_count INTEGER, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS registry_value_backups (
            id INTEGER PRIMARY KEY,
            path TEXT NOT NULL,
            name TEXT NOT NULL,
            existed INTEGER NOT NULL DEFAULT 0,
            value_type TEXT,
            value TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(path, name)
        );
        CREATE TABLE IF NOT EXISTS tweak_settings (
            id INTEGER PRIMARY KEY, tweak_key TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 0,
            requires_reboot INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
            module TEXT NOT NULL, schedule_type TEXT NOT NULL,
            time TEXT, day TEXT, enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS benchmark_results (
            id INTEGER PRIMARY KEY, benchmark_type TEXT NOT NULL,
            score REAL NOT NULL, unit TEXT NOT NULL,
            profile_name TEXT, created_at TEXT NOT NULL
        );",
    )?;

    // Existing v0.1 databases do not have this timestamp column.
    if !has_column(conn, "tweak_settings", "updated_at")? {
        conn.execute(
            "ALTER TABLE tweak_settings ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    Ok(())
}

fn get_db_path(app_dir: &Path) -> PathBuf {
    app_dir.join("gm_optimization.db")
}

fn migrate_legacy_database(target: &Path) {
    if target.exists() {
        return;
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        let legacy = PathBuf::from(appdata)
            .join("com.optimization-way.optimizer")
            .join("optimization_way.db");
        if legacy.is_file() {
            if let Some(parent) = target.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::copy(legacy, target);
        }
    }
}

pub fn initialize_database(app_handle: &tauri::AppHandle) -> Result<Database> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    let db_path = get_db_path(&app_dir);
    migrate_legacy_database(&db_path);
    let conn = Connection::open(db_path)?;
    create_tables(&conn)?;
    Ok(Database { conn: Mutex::new(conn) })
}

pub fn initialize_database_headless() -> Result<Database> {
    let app_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(r"C:\ProgramData"))
        .join("com.gmoptimization.desktop");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    let db_path = get_db_path(&app_dir);
    migrate_legacy_database(&db_path);
    let conn = Connection::open(db_path)?;
    create_tables(&conn)?;
    Ok(Database { conn: Mutex::new(conn) })
}
