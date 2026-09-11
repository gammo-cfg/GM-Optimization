use crate::models::RestorePointInfo;
use crate::util::cmd;

#[tauri::command]
pub async fn create_restore_point(label: String) -> Result<String, String> {
    let desc = format!("'GM-Optimization - {}'", label.replace('\'', ""));
    let ps = format!(
        "Checkpoint-Computer -Description {} -RestorePointType MODIFY_SETTINGS",
        desc
    );
    let output = cmd("powershell")
        .args(["-Command", &ps])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(format!("Restore point created: {}", label))
    } else {
        // Restore points might not be enabled
        if stderr.contains("not enabled") || stdout.contains("not enabled") {
            Err("System Restore is not enabled on this drive. Enable it in System Properties > System Protection first.".into())
        } else {
            Err(format!("Failed: {} {}", stderr, stdout))
        }
    }
}

#[tauri::command]
pub async fn get_restore_points() -> Result<Vec<RestorePointInfo>, String> {
    let output = cmd("powershell")
        .args(["-NoProfile", "-Command", "Get-ComputerRestorePoint | Select-Object Description, CreationTime, SequenceNumber | ConvertTo-Json -Compression"])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    let trimmed = stdout.trim();
    if trimmed.is_empty() || trimmed == "[]" || trimmed == "\n" {
        return Ok(Vec::new());
    }

    // ConvertTo-Json returns a single object or array depending on count
    let json = if trimmed.starts_with('[') { trimmed.to_string() } else { format!("[{}]", trimmed) };

    #[derive(serde::Deserialize)]
    struct RawPoint {
        #[serde(rename = "Description")]
        description: String,
        #[serde(rename = "CreationTime")]
        creation_time: String,
        #[serde(rename = "SequenceNumber")]
        sequence_number: i64,
    }

    let raw: Vec<RawPoint> = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse restore points: {}", e))?;

    Ok(raw.into_iter().map(|r| RestorePointInfo {
        description: r.description,
        created_at: r.creation_time,
        sequence_number: r.sequence_number,
    }).collect())
}

#[tauri::command]
pub async fn restore_system(sequence_number: i64) -> Result<String, String> {
    let ps = format!("Restore-Computer -RestorePoint {}", sequence_number);
    let output = cmd("powershell")
        .args(["-Command", &ps])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    if output.status.success() {
        Ok("System restore initiated. Your computer will restart.".into())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Restore failed: {}", stderr))
    }
}
