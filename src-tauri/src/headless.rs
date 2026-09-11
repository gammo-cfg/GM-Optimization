use crate::db;
use chrono::Local;
use std::path::Path;
use walkdir::WalkDir;

fn normalize(path: &str) -> String {
    path.trim_end_matches(['\\', '/']).replace('/', "\\").to_ascii_lowercase()
}

fn is_excluded(path: &Path, exclusions: &[String]) -> bool {
    let candidate = normalize(&path.to_string_lossy());
    exclusions.iter().any(|entry| {
        let excluded = normalize(entry);
        candidate == excluded || candidate.starts_with(&(excluded + "\\"))
    })
}

fn junk_clean_headless(db: &db::Database) -> (String, i64, i64) {
    let temp = std::env::var("TEMP").unwrap_or_else(|_| r"C:\Windows\Temp".into());
    let windir = std::env::var("WINDIR").unwrap_or_else(|_| r"C:\Windows".into());
    let localappdata = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| r"C:\Users\Default\AppData\Local".into());

    // Intentionally conservative: scheduled cleanup is limited to ordinary temp/cache locations.
    let locations = vec![
        std::path::PathBuf::from(format!(r"{}\Temp", windir)),
        std::path::PathBuf::from(temp),
        std::path::PathBuf::from(format!(r"{}\Microsoft\Windows\ShaderCache", localappdata)),
        std::path::PathBuf::from(format!(r"{}\D3DSCache", localappdata)),
    ];

    let exclusions: Vec<String> = db.conn.lock().ok().and_then(|conn| {
        let mut stmt = conn.prepare("SELECT path FROM exclusion_list").ok()?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0)).ok()?;
        Some(rows.filter_map(Result::ok).collect())
    }).unwrap_or_default();

    let mut removed = 0u64;
    let mut freed = 0u64;
    for root in &locations {
        if !root.is_dir() { continue; }
        for entry in WalkDir::new(root).follow_links(false).max_depth(8).into_iter().filter_map(Result::ok) {
            if !entry.file_type().is_file() || is_excluded(entry.path(), &exclusions) { continue; }
            let size = entry.metadata().ok().map(|m| m.len()).unwrap_or(0);
            if std::fs::remove_file(entry.path()).is_ok() {
                freed = freed.saturating_add(size);
                removed = removed.saturating_add(1);
            }
        }
    }

    let summary = format!("Scheduled GM cleanup: {removed} items, {} MB freed", freed / (1024 * 1024));
    (summary, removed.min(i64::MAX as u64) as i64, freed.min(i64::MAX as u64) as i64)
}

pub fn run_task(task: &str) {
    let db = match db::initialize_database_headless() {
        Ok(d) => d,
        Err(e) => { eprintln!("Headless: failed to init DB: {e}"); return; }
    };

    let (result_json, module, item_count, total_size) = match task {
        "junk_cleaner" => {
            let (message, count, bytes) = junk_clean_headless(&db);
            (message, "junk_cleaner", count, bytes)
        }
        other => { eprintln!("Headless: unknown task: {other}"); return; }
    };

    let save_result = match db.conn.lock() {
        Ok(conn) => conn
            .execute(
                "INSERT INTO scan_history (module, scanned_at, total_size, item_count, result_json) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    module,
                    Local::now().to_rfc3339(),
                    total_size,
                    item_count,
                    result_json
                ],
            )
            .map(|_| ())
            .map_err(|e| format!("failed to save scan history: {e}")),
        Err(e) => Err(format!("failed to lock database: {e}")),
    };

    if let Err(e) = save_result {
        eprintln!("Headless: {e}");
    }
}
