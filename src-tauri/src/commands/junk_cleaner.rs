use crate::db::Database;
use crate::models::*;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{Emitter, State};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkScanRequest {
    #[serde(default)]
    pub custom_paths: Vec<String>,
}

fn get_junk_locations() -> Vec<(String, String, Vec<PathBuf>)> {
    let temp = std::env::var("TEMP").unwrap_or_default();
    let windir = std::env::var("WINDIR").unwrap_or_else(|_| r"C:\Windows".into());
    let local = std::env::var("LOCALAPPDATA").unwrap_or_default();

    vec![
        (
            "user_temp".into(),
            "User temporary files".into(),
            vec![PathBuf::from(temp)],
        ),
        (
            "windows_temp".into(),
            "Windows temporary files".into(),
            vec![PathBuf::from(&windir).join("Temp")],
        ),
        (
            "graphics_cache".into(),
            "Graphics shader caches".into(),
            vec![
                PathBuf::from(&local).join("D3DSCache"),
                PathBuf::from(&local).join(r"Microsoft\Windows\ShaderCache"),
            ],
        ),
        (
            "web_cache".into(),
            "Windows web cache".into(),
            vec![PathBuf::from(&local).join(r"Microsoft\Windows\INetCache")],
        ),
        (
            "crash_dumps".into(),
            "Application crash dumps".into(),
            vec![PathBuf::from(&local).join("CrashDumps")],
        ),
    ]
}

fn normalize_for_compare(path: &str) -> String {
    path.trim_end_matches(['\\', '/']).replace('/', "\\").to_ascii_lowercase()
}

fn is_excluded(path: &Path, exclusions: &[String]) -> bool {
    let candidate = normalize_for_compare(&path.to_string_lossy());
    exclusions.iter().any(|excluded| {
        let excluded = normalize_for_compare(excluded);
        candidate == excluded || candidate.starts_with(&(excluded + "\\"))
    })
}

fn load_exclusions(db: &Database) -> Result<Vec<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT path FROM exclusion_list").map_err(|e| e.to_string())?;
    let exclusions: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    Ok(exclusions)
}

fn scan_path(path: &Path, exclusions: &[String]) -> (u64, u64, Vec<String>) {
    if !path.is_dir() {
        return (0, 0, Vec::new());
    }
    let mut size = 0u64;
    let mut count = 0u64;
    let mut preview = Vec::new();
    for entry in WalkDir::new(path).follow_links(false).max_depth(8).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() || is_excluded(entry.path(), exclusions) {
            continue;
        }
        if let Ok(meta) = entry.metadata() {
            size = size.saturating_add(meta.len());
            count = count.saturating_add(1);
            if preview.len() < 120 {
                preview.push(entry.path().to_string_lossy().to_string());
            }
        }
    }
    (size, count, preview)
}

fn clean_directory_contents(root: &Path, exclusions: &[String]) -> (u64, u64, Vec<String>) {
    if !root.is_dir() {
        return (0, 0, Vec::new());
    }
    let mut entries: Vec<_> = WalkDir::new(root)
        .follow_links(false)
        .max_depth(8)
        .into_iter()
        .filter_map(Result::ok)
        .collect();
    entries.sort_by_key(|entry| std::cmp::Reverse(entry.depth()));

    let mut removed = 0u64;
    let mut freed = 0u64;
    let mut errors = Vec::new();
    for entry in entries {
        if entry.depth() == 0 || is_excluded(entry.path(), exclusions) {
            continue;
        }
        if entry.file_type().is_file() {
            let size = entry.metadata().ok().map(|m| m.len()).unwrap_or(0);
            match std::fs::remove_file(entry.path()) {
                Ok(()) => {
                    removed = removed.saturating_add(1);
                    freed = freed.saturating_add(size);
                }
                Err(error) => {
                    if errors.len() < 40 {
                        errors.push(format!("{}: {error}", entry.path().display()));
                    }
                }
            }
        } else if entry.file_type().is_dir() {
            // Removing only empty children preserves cache/temp roots and any excluded content.
            let _ = std::fs::remove_dir(entry.path());
        }
    }
    (removed, freed, errors)
}

#[tauri::command]
pub async fn scan_junk(
    app_handle: tauri::AppHandle,
    request: JunkScanRequest,
    db: State<'_, Database>,
) -> Result<JunkScanResult, String> {
    if request.custom_paths.len() > 20 {
        return Err("Too many custom scan paths".into());
    }
    let exclusions = load_exclusions(&db)?;
    let locations = get_junk_locations();
    let total_steps = locations.iter().map(|(_, _, paths)| paths.len()).sum::<usize>()
        + request.custom_paths.iter().filter(|p| Path::new(p).is_dir()).count();
    let total_steps = total_steps.max(1) as u64;
    let mut processed = 0u64;
    let mut categories = Vec::new();
    let mut total_size = 0u64;
    let mut total_files = 0u64;

    for (id, name, paths) in locations {
        let mut category_size = 0u64;
        let mut category_files = 0u64;
        let mut preview = Vec::new();
        for path in paths {
            let _ = app_handle.emit("scan-progress", serde_json::json!({
                "current": processed, "total": total_steps, "label": name
            }));
            let (size, count, files) = scan_path(&path, &exclusions);
            category_size = category_size.saturating_add(size);
            category_files = category_files.saturating_add(count);
            preview.extend(files.into_iter().take(120usize.saturating_sub(preview.len())));
            processed += 1;
        }
        total_size = total_size.saturating_add(category_size);
        total_files = total_files.saturating_add(category_files);
        categories.push(JunkCategoryResult {
            category_id: id,
            category_name: name,
            file_count: category_files,
            total_size: category_size,
            files: preview,
        });
    }

    // Custom paths are scan-only in v0.2.0. This avoids silently deleting arbitrary user folders.
    for custom in &request.custom_paths {
        let path = PathBuf::from(custom);
        if !path.is_dir() {
            continue;
        }
        let _ = app_handle.emit("scan-progress", serde_json::json!({
            "current": processed, "total": total_steps, "label": format!("Inspecting {}", path.display())
        }));
        let (size, count, files) = scan_path(&path, &exclusions);
        total_size = total_size.saturating_add(size);
        total_files = total_files.saturating_add(count);
        categories.push(JunkCategoryResult {
            category_id: format!("custom_scan_{}", categories.len()),
            category_name: format!("Custom scan · {}", path.display()),
            file_count: count,
            total_size: size,
            files,
        });
        processed += 1;
    }

    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "current": total_steps, "total": total_steps, "label": "Scan complete"
    }));
    let result = JunkScanResult { categories, total_size, total_files };
    if let Ok(json) = serde_json::to_string(&result) {
        let size = total_size.min(i64::MAX as u64) as i64;
        let count = total_files.min(i64::MAX as u64) as i64;
        let _ = super::history::save_scan_result(&db, "junk_scan", size, count, &json);
    }
    Ok(result)
}

#[tauri::command]
pub async fn clean_junk(
    app_handle: tauri::AppHandle,
    selected_categories: Vec<String>,
    db: State<'_, Database>,
) -> Result<CleanResult, String> {
    if selected_categories.is_empty() || selected_categories.len() > 20 {
        return Err("Choose at least one valid cleanup category".into());
    }
    if selected_categories.iter().any(|id| id.starts_with("custom_scan_")) {
        return Err("Custom paths are scan-only for safety".into());
    }
    let exclusions = load_exclusions(&db)?;
    let allowed = get_junk_locations();
    let mut paths = Vec::new();
    for (id, _, locations) in allowed {
        if selected_categories.iter().any(|selected| selected == &id) {
            paths.extend(locations.into_iter().filter(|path| path.is_dir()));
        }
    }
    if paths.is_empty() {
        return Err("No valid cleanup locations were selected".into());
    }

    let total = paths.len() as u64;
    let mut removed = 0u64;
    let mut freed = 0u64;
    let mut errors = Vec::new();
    for (index, path) in paths.iter().enumerate() {
        let _ = app_handle.emit("scan-progress", serde_json::json!({
            "current": index as u64, "total": total, "label": format!("Cleaning {}", path.display())
        }));
        let (count, size, mut path_errors) = clean_directory_contents(path, &exclusions);
        removed = removed.saturating_add(count);
        freed = freed.saturating_add(size);
        errors.append(&mut path_errors);
    }
    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "current": total, "total": total, "label": "Cleanup complete"
    }));

    let summary = serde_json::json!({ "categories": selected_categories, "errors": errors.len() }).to_string();
    let _ = super::history::save_scan_result(
        &db,
        "junk_cleanup",
        freed.min(i64::MAX as u64) as i64,
        removed.min(i64::MAX as u64) as i64,
        &summary,
    );
    Ok(CleanResult { items_removed: removed, space_freed: freed, errors })
}
