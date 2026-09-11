use crate::db::Database;
use crate::models::*;
use chrono::Utc;
use tauri::State;

#[tauri::command]
pub async fn export_profile(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Read all tweaks from DB
    let mut tweaks = Vec::new();
    if let Ok(mut stmt) = conn.prepare("SELECT tweak_key, enabled FROM tweak_settings") {
        for row in stmt.query_map([], |r| {
            Ok(ProfileTweak { key: r.get(0)?, enabled: r.get(1)? })
        }).into_iter().flatten().flatten() {
            tweaks.push(row);
        }
    }

    // Network tweaks are also stored in tweak_settings (keys prefixed)
    let mut network_tweaks = Vec::new();
    let net_prefixes = ["disable_nagle", "tcp_", "enable_rss", "disable_ecn", "disable_ipv6",
                        "disable_eee", "disable_interrupt", "dns_cache"];
    for t in &tweaks {
        if net_prefixes.iter().any(|p| t.key.starts_with(p)) {
            network_tweaks.push(ProfileTweak { key: t.key.clone(), enabled: t.enabled });
        }
    }
    // Also get network tweaks that might not be in tweak_settings yet
    // by checking what the known network tweak keys are
    let known_network_keys = [
        "disable_nagle", "tcp_autotuning_high", "tcp_autotuning_disabled",
        "tcp_fastopen", "enable_rss", "disable_ecn", "disable_ipv6",
        "disable_eee", "disable_interrupt_moderation", "dns_cache_large",
    ];
    for key in known_network_keys {
        if !network_tweaks.iter().any(|t| t.key == key) {
            network_tweaks.push(ProfileTweak { key: key.to_string(), enabled: false });
        }
    }

    // Exclusions
    let mut exclusions = Vec::new();
    if let Ok(mut stmt) = conn.prepare("SELECT path FROM exclusion_list") {
        for row in stmt.query_map([], |r| r.get::<_, String>(0)).into_iter().flatten().flatten() {
            exclusions.push(row);
        }
    }
    drop(conn);

    let profile = ProfileExport {
        version: 1,
        name: "Optimization Profile".into(),
        description: "Exported from GM-Optimization".into(),
        created_at: Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        tweaks,
        network_tweaks,
        exclusions,
    };
    serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_profile(db: State<'_, Database>, json: String, name: String, _description: String) -> Result<String, String> {
    let profile: ProfileImport = serde_json::from_str(&json).map_err(|e| format!("Invalid profile JSON: {}", e))?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut count = 0u32;
    for tw in &profile.tweaks {
        conn.execute(
            "INSERT INTO tweak_settings (tweak_key, enabled, requires_reboot, updated_at) VALUES (?1, ?2, 0, ?3) ON CONFLICT(tweak_key) DO UPDATE SET enabled = ?2, updated_at = ?3",
            rusqlite::params![tw.key, tw.enabled, Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }
    for ntw in &profile.network_tweaks {
        conn.execute(
            "INSERT INTO tweak_settings (tweak_key, enabled, requires_reboot, updated_at) VALUES (?1, ?2, 0, ?3) ON CONFLICT(tweak_key) DO UPDATE SET enabled = ?2, updated_at = ?3",
            rusqlite::params![ntw.key, ntw.enabled, Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }
    for path in &profile.exclusions {
        conn.execute(
            "INSERT OR IGNORE INTO exclusion_list (path, added_at) VALUES (?1, ?2)",
            rusqlite::params![path, Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()],
        ).map_err(|e| e.to_string())?;
    }
    drop(conn);

    Ok(format!("Imported profile '{}': {} tweaks applied, {} exclusions added", name, count, profile.exclusions.len()))
}
