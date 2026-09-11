use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkCategoryResult {
    pub category_id: String,
    pub category_name: String,
    pub file_count: u64,
    pub total_size: u64,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkScanResult {
    pub categories: Vec<JunkCategoryResult>,
    pub total_size: u64,
    pub total_files: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResult {
    pub items_removed: u64,
    pub space_freed: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanHistoryEntry {
    pub id: i64,
    pub module: String,
    pub scanned_at: String,
    pub total_size: i64,
    pub item_count: i64,
    pub result_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExclusionEntry {
    pub id: i64,
    pub path: String,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu: Vec<InfoEntry>,
    pub gpu: Vec<InfoEntry>,
    pub ram: Vec<InfoEntry>,
    pub motherboard: Vec<InfoEntry>,
    pub storage: Vec<InfoEntry>,
    pub network: Vec<InfoEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfoEntry {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub id: i64,
    pub benchmark_type: String,
    pub score: f64,
    pub unit: String,
    pub profile_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestorePointInfo {
    pub description: String,
    pub created_at: String,
    pub sequence_number: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub id: i64,
    pub name: String,
    pub module: String,
    pub schedule_type: String,
    pub time: Option<String>,
    pub day: Option<String>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileTweak {
    pub key: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileExport {
    pub version: u32,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub tweaks: Vec<ProfileTweak>,
    pub network_tweaks: Vec<ProfileTweak>,
    pub exclusions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileImport {
    pub name: String,
    pub description: String,
    pub tweaks: Vec<ProfileTweak>,
    pub network_tweaks: Vec<ProfileTweak>,
    pub exclusions: Vec<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TweakState {
    pub key: String,
    pub enabled: bool,
    pub requires_reboot: bool,
    pub updated_at: String,
}
