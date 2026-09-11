use crate::models::{InfoEntry, SystemInfo};
use crate::util::cmd;

fn run_pwsh(script: &str) -> String {
    cmd("powershell")
        .args(["-Command", script])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

pub async fn collect_system_info() -> Result<SystemInfo, String> {
    // CPU
    let cpu_name = run_pwsh("(Get-CimInstance Win32_Processor).Name");
    let cpu_cores = run_pwsh("(Get-CimInstance Win32_Processor).NumberOfCores");
    let cpu_threads = run_pwsh("(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors");
    let cpu_speed = run_pwsh("[math]::Round((Get-CimInstance Win32_Processor).MaxClockSpeed / 1000, 2)");
    let cpu_arch = run_pwsh("(Get-CimInstance Win32_Processor).Architecture");
    let cpu_l2 = run_pwsh("(Get-CimInstance Win32_Processor).L2CacheSize");
    let cpu_l3 = run_pwsh("(Get-CimInstance Win32_Processor).L3CacheSize");

    let cpu = vec![
        InfoEntry { label: "Model".into(), value: cpu_name },
        InfoEntry { label: "Cores".into(), value: cpu_cores },
        InfoEntry { label: "Threads".into(), value: cpu_threads },
        InfoEntry { label: "Max Clock".into(), value: format!("{} GHz", cpu_speed) },
        InfoEntry { label: "L2 Cache".into(), value: format!("{} KB", cpu_l2) },
        InfoEntry { label: "L3 Cache".into(), value: format!("{} KB", cpu_l3) },
        InfoEntry { label: "Architecture".into(), value: cpu_arch },
    ];

    // GPU
    let gpu_name = run_pwsh("$gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 }; ($gpus | ForEach-Object { $_.Name }) -join ', '");
    let gpu_ram = run_pwsh("$gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 }; ($gpus | ForEach-Object { if ($_.AdapterRAM -gt 1e9) { '{0:N1} GB' -f ($_.AdapterRAM / 1e9) } else { '{0:N0} MB' -f ($_.AdapterRAM / 1e6) } }) -join ', '");
    let gpu_driver = run_pwsh("$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 } | Select-Object -First 1; if ($gpu) { $gpu.DriverVersion } else { '' }");
    let gpu_res = run_pwsh("$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 } | Select-Object -First 1; if ($gpu) { $gpu.CurrentHorizontalResolution.ToString() + 'x' + $gpu.CurrentVerticalResolution.ToString() } else { 'Unknown' }");

    let gpu = vec![
        InfoEntry { label: "GPU".into(), value: gpu_name },
        InfoEntry { label: "VRAM".into(), value: gpu_ram },
        InfoEntry { label: "Driver".into(), value: gpu_driver },
        InfoEntry { label: "Resolution".into(), value: gpu_res },
    ];

    // RAM
    let ram_total = run_pwsh("[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1e9, 1)");
    let ram_speed = run_pwsh("(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).Speed");
    let ram_form = run_pwsh("(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).FormFactor");
    let ram_slots = run_pwsh("@(Get-CimInstance Win32_PhysicalMemory).Count");

    let ram = vec![
        InfoEntry { label: "Total".into(), value: format!("{} GB", ram_total) },
        InfoEntry { label: "Speed".into(), value: format!("{} MHz", ram_speed) },
        InfoEntry { label: "Slots Used".into(), value: ram_slots },
        InfoEntry { label: "Form Factor".into(), value: ram_form },
    ];

    // Motherboard
    let mb_manuf = run_pwsh("(Get-CimInstance Win32_BaseBoard).Manufacturer");
    let mb_product = run_pwsh("(Get-CimInstance Win32_BaseBoard).Product");
    let bios_vendor = run_pwsh("(Get-CimInstance Win32_BIOS).Manufacturer");
    let bios_ver = run_pwsh("(Get-CimInstance Win32_BIOS).SMBIOSBIOSVersion");
    let bios_date = run_pwsh("(Get-CimInstance Win32_BIOS).ReleaseDate");

    let motherboard = vec![
        InfoEntry { label: "Manufacturer".into(), value: mb_manuf },
        InfoEntry { label: "Model".into(), value: mb_product },
        InfoEntry { label: "BIOS Vendor".into(), value: bios_vendor },
        InfoEntry { label: "BIOS Version".into(), value: bios_ver },
        InfoEntry { label: "BIOS Date".into(), value: bios_date },
    ];

    // Storage
    let mut storage = Vec::new();
    let storage_raw = run_pwsh("Get-CimInstance Win32_DiskDrive | Select-Object Model, Size, InterfaceType, MediaType | ConvertTo-Json -Compression");
    if !storage_raw.is_empty() && storage_raw != "[]" && storage_raw != "\n" {
        let json = if storage_raw.trim().starts_with('[') { storage_raw.trim().to_string() } else { format!("[{}]", storage_raw.trim()) };
        if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            for item in &parsed {
                let model = item.get("Model").and_then(|v| v.as_str()).unwrap_or("Unknown");
                let size_gb = item.get("Size").and_then(|v| v.as_f64()).unwrap_or(0.0) / 1e9;
                let iface = item.get("InterfaceType").and_then(|v| v.as_str()).unwrap_or("");
                let media = item.get("MediaType").and_then(|v| v.as_str()).unwrap_or("");
                storage.push(InfoEntry {
                    label: format!("{:.0} GB {} {}", size_gb, iface, media),
                    value: model.to_string(),
                });
            }
        }
    }

    let os_name = run_pwsh("(Get-CimInstance Win32_OperatingSystem).Caption");
    let os_ver = run_pwsh("(Get-CimInstance Win32_OperatingSystem).Version");

    let network = vec![
        InfoEntry { label: "OS".into(), value: os_name },
        InfoEntry { label: "Build".into(), value: os_ver },
    ];

    Ok(SystemInfo { cpu, gpu, ram, motherboard, storage, network })
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    collect_system_info().await
}
