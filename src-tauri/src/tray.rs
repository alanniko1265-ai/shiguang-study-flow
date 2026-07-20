#[cfg(desktop)]
pub fn setup(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::MenuBuilder,
        tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
        Emitter,
    };

    let menu = MenuBuilder::new(app)
        .text("show", "显示拾光")
        .text("toggle-timer", "暂停 / 继续计时")
        .text("finish-timer", "完成本次专注")
        .separator()
        .text("quit", "退出拾光")
        .build()?;

    let mut tray = TrayIconBuilder::with_id("shiguang-tray")
        .tooltip("拾光 · 学习记录")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "toggle-timer" => {
                let _ = app.emit("tray-timer-action", "toggle");
            }
            "finish-timer" => {
                let _ = app.emit("tray-timer-action", "finish");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
