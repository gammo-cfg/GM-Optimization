use serde::Serialize;
use crate::util::cmd;

#[derive(Debug, Serialize)]
pub struct DriveSummary {
    pub letter: String,
    pub size: String,
}

#[derive(Debug, Serialize)]
pub struct InitResult {
    pub cpu_name: String,
    pub gpu_name: String,
    pub ram_total: String,
    pub drives: Vec<DriveSummary>,
    pub is_admin: bool,
}

fn run_pwsh(script: &str) -> String {
    cmd("powershell")
        .args(["-Command", script])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub async fn init_app() -> Result<InitResult, String> {
    let cpu_name = run_pwsh("(Get-CimInstance Win32_Processor).Name");
    let gpu_name = run_pwsh("(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name");
    let ram_total = run_pwsh("[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1e9, 1)");
    let is_admin = run_pwsh("([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)")
        .eq_ignore_ascii_case("true");

    let mut drives = Vec::new();
    let drives_raw = run_pwsh("Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID, @{N='SizeGB';E={[math]::Round($_.Size/1e9,0)}} | ConvertTo-Json -Compression");
    if !drives_raw.is_empty() && drives_raw != "[]" && drives_raw != "\n" {
        let json = if drives_raw.trim().starts_with('[') { drives_raw.trim().to_string() } else { format!("[{}]", drives_raw.trim()) };
        if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            for item in &parsed {
                if let Some(letter) = item.get("DeviceID").and_then(|v| v.as_str()) {
                    let size = item
                        .get("SizeGB")
                        .and_then(|value| {
                            value
                                .as_u64()
                                .map(|n| n.to_string())
                                .or_else(|| value.as_i64().map(|n| n.to_string()))
                                .or_else(|| value.as_f64().map(|n| format!("{n:.0}")))
                                .or_else(|| value.as_str().map(str::to_owned))
                        })
                        .unwrap_or_else(|| "?".to_string());
                    drives.push(DriveSummary { letter: letter.to_string(), size: format!("{size} GB") });
                }
            }
        }
    }

    Ok(InitResult {
        cpu_name,
        gpu_name,
        ram_total: format!("{} GB", ram_total),
        drives,
        is_admin,
    })
}
