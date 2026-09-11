mod commands;
mod db;
pub mod headless;
mod models;
mod util;

use tauri::Manager;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let conn = db::initialize_database(app.handle())
                .expect("Failed to initialize database");
            app.handle().manage(conn);

            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)
                .expect("failed to create menu item");
            let separator = PredefinedMenuItem::separator(app)
                .expect("failed to create separator");
            let task_junk = MenuItem::with_id(app, "task_junk", "Run Junk Cleaner", true, None::<&str>)
                .expect("failed to create menu item");
            let quick_sub = Submenu::with_items(app, "Quick Tasks", true, &[&task_junk])
                .expect("failed to create submenu");
            let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("Ctrl+Q"))
                .expect("failed to create menu item");
            let menu = Menu::with_items(app, &[&show, &separator, &quick_sub, &separator, &quit])
                .expect("failed to create menu");

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("GM-Optimization")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "task_junk" => {
                            std::thread::spawn(|| {
                                headless::run_task("junk_cleaner");
                            });
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)
                .expect("failed to build system tray");

            let window = app.get_webview_window("main").unwrap();
            let _ = window.show();
            let _ = window.set_focus();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::junk_cleaner::scan_junk,
            commands::junk_cleaner::clean_junk,
            commands::history::get_scan_history,
            commands::history::clear_scan_history,
            commands::exclusions::get_exclusions,
            commands::exclusions::add_exclusion,
            commands::exclusions::remove_exclusion,
            commands::scheduler::get_schedules,
            commands::scheduler::create_schedule,
            commands::scheduler::delete_schedule,
            commands::scheduler::toggle_schedule,
            commands::tweaks::apply_registry_tweak,
            commands::tweaks::get_tweak_states,
            commands::tweaks::set_tweak_state,
            commands::tweaks::execute_powershell_tweak,
            commands::tweaks::execute_native_commands,
            commands::tweaks::configure_services,
            commands::init::init_app,
            commands::system_info::get_system_info,
            commands::benchmark::run_disk_benchmark,
            commands::benchmark::run_network_benchmark,
            commands::benchmark::run_cpu_benchmark,
            commands::benchmark::run_all_benchmarks,
            commands::benchmark::get_benchmark_history,
            commands::benchmark::clear_benchmark_history,
            commands::restore::create_restore_point,
            commands::restore::get_restore_points,
            commands::restore::restore_system,
            commands::profiles::export_profile,
            commands::profiles::import_profile,
            commands::tweaks::shutdown_system,
            commands::tweaks::read_registry_values,
            commands::startup::get_startup_items,
            commands::startup::toggle_startup_item,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

