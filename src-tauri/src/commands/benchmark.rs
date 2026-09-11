use crate::db::Database;
use crate::models::BenchmarkResult;
use crate::util::cmd;
use chrono::Local;
use std::time::{Duration, Instant};
use tauri::State;

#[tauri::command]
pub async fn run_disk_benchmark() -> Result<BenchmarkResult, String> {
    let temp_file = std::env::temp_dir().join("opt_way_bench.tmp");
    let size_mb = 512u64;
    let size_bytes = size_mb * 1024 * 1024;
    let buffer = vec![0u8; 65536];

    // Write
    let start = Instant::now();
    {
        use std::io::Write;
        let mut f = std::fs::File::create(&temp_file).map_err(|e| format!("create: {}", e))?;
        let mut written = 0u64;
        while written < size_bytes {
            let to_write = std::cmp::min(buffer.len() as u64, size_bytes - written) as usize;
            f.write_all(&buffer[..to_write]).map_err(|e| format!("write: {}", e))?;
            written += to_write as u64;
        }
    }
    let write_time = start.elapsed();

    // Read
    let start = Instant::now();
    {
        use std::io::Read;
        let mut f = std::fs::File::open(&temp_file).map_err(|e| format!("open: {}", e))?;
        let mut buf = vec![0u8; 65536];
        loop {
            let bytes_read = f.read(&mut buf).map_err(|e| format!("read: {}", e))?;
            if bytes_read == 0 { break; }
        }
    }
    let read_time = start.elapsed();

    let _ = std::fs::remove_file(&temp_file);

    let write_secs = write_time.as_secs_f64().max(0.001);
    let read_secs = read_time.as_secs_f64().max(0.001);
    let write_speed = (size_bytes as f64 / write_secs) / (1024.0 * 1024.0);
    let read_speed = (size_bytes as f64 / read_secs) / (1024.0 * 1024.0);

    let avg = (write_speed + read_speed) / 2.0;

    Ok(BenchmarkResult {
        id: 0,
        benchmark_type: "disk".into(),
        score: avg,
        unit: "MB/s".into(),
        profile_name: Some(format!("{:.0} MB/s write, {:.0} MB/s read", write_speed, read_speed)),
        created_at: Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn run_network_benchmark() -> Result<BenchmarkResult, String> {
    let targets = ["1.1.1.1", "8.8.8.8", "google.com"];
    let mut total_ms = 0.0;
    let mut count = 0u32;

    for target in &targets {
        let output = cmd("ping")
            .args(["-n", "1", "-w", "3000", target])
            .output()
            .map_err(|e| format!("ping failed: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            for token in line.split_whitespace() {
                let cleaned = token.replace(|c: char| !c.is_ascii_digit() && c != '.', "");
                if !cleaned.is_empty() && token.contains("ms") {
                    if let Ok(ms) = cleaned.parse::<f64>() {
                        total_ms += ms;
                        count += 1;
                        break;
                    }
                }
            }
        }
    }

    let avg_latency = if count > 0 { total_ms / count as f64 } else { 999.0 };
    Ok(BenchmarkResult {
        id: 0,
        benchmark_type: "network".into(),
        score: avg_latency,
        unit: "ms".into(),
        profile_name: Some(format!("Avg ping across {} targets", count)),
        created_at: Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn run_cpu_benchmark() -> Result<BenchmarkResult, String> {
    let duration = Duration::from_secs(3);
    let num_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    let start = Instant::now();
    let mut handles = Vec::new();
    for _ in 0..num_threads {
        handles.push(std::thread::spawn(move || {
            let mut count = 0u64;
            let deadline = Instant::now() + duration;
            while Instant::now() < deadline {
                // CPU-heavy calculation
                let mut x: f64 = 12345.6789;
                for _ in 0..1000 {
                    x = (x * 1.0001).sin().cos().abs().sqrt();
                }
                count += 1;
            }
            count
        }));
    }

    let mut total_ops = 0u64;
    for h in handles {
        total_ops += h.join().unwrap_or(0);
    }
    let elapsed = start.elapsed().as_secs_f64();
    let ops_per_sec = total_ops as f64 / elapsed;

    Ok(BenchmarkResult {
        id: 0,
        benchmark_type: "cpu".into(),
        score: ops_per_sec,
        unit: "ops/s".into(),
        profile_name: Some(format!("{} threads, 3s", num_threads)),
        created_at: Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn get_benchmark_history(db: State<'_, Database>) -> Result<Vec<BenchmarkResult>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, benchmark_type, score, unit, profile_name, created_at FROM benchmark_results ORDER BY created_at DESC LIMIT 20")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(BenchmarkResult {
            id: row.get(0)?,
            benchmark_type: row.get(1)?,
            score: row.get(2)?,
            unit: row.get(3)?,
            profile_name: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(rows)
}

fn save_benchmark(db: &Database, b: &BenchmarkResult) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO benchmark_results (benchmark_type, score, unit, profile_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![b.benchmark_type, b.score, b.unit, b.profile_name, b.created_at],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn run_all_benchmarks(db: State<'_, Database>) -> Result<Vec<BenchmarkResult>, String> {
    let disk = run_disk_benchmark().await?;
    let _ = save_benchmark(&db, &disk);

    let net = run_network_benchmark().await?;
    let _ = save_benchmark(&db, &net);

    let cpu = run_cpu_benchmark().await?;
    let _ = save_benchmark(&db, &cpu);

    Ok(vec![disk, net, cpu])
}

#[tauri::command]
pub async fn clear_benchmark_history(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM benchmark_results", []).map_err(|e| e.to_string())?;
    Ok(())
}
