#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Headless mode for scheduled tasks. Accept both `--task junk_cleaner`
    // and `--task=junk_cleaner` so Windows Task Scheduler is resilient to
    // quoting/argument formatting differences.
    if args.iter().any(|a| a == "--silent") {
        let task = args
            .iter()
            .find_map(|a| a.strip_prefix("--task="))
            .or_else(|| {
                args.iter()
                    .position(|a| a == "--task")
                    .and_then(|i| args.get(i + 1))
                    .map(String::as_str)
            });
        if let Some(task) = task {
            gm_optimization_lib::headless::run_task(task);
        }
        return;
    }

    gm_optimization_lib::run();
}
