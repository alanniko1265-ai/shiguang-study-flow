mod backups;
mod shutdown;
mod system_idle;
mod system_notifications;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        use tauri::Manager;

        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    builder
        .invoke_handler(tauri::generate_handler![
            backups::create_auto_backup,
            backups::get_backup_info,
            backups::open_backup_directory,
            system_idle::get_system_activity,
            system_idle::get_system_idle_seconds,
            system_notifications::send_supervision_notification,
            shutdown::cache_shutdown_snapshot,
            shutdown::load_shutdown_snapshot
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(shutdown::ShutdownState::default())
        .setup(|app| {
            let _ = system_notifications::register_notification_source();
            #[cfg(desktop)]
            tray::setup(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Shiguang")
        .run(|app, event| match event {
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                let _ = shutdown::flush(app);
            }
            tauri::RunEvent::WindowEvent {
                event: tauri::WindowEvent::CloseRequested { .. },
                ..
            } => {
                let _ = shutdown::flush(app);
            }
            _ => {}
        });
}
