const APP_USER_MODEL_ID: &str = "com.studyflow.shiguang";

#[cfg(target_os = "windows")]
fn notification_executable() -> Result<std::path::PathBuf, String> {
    let current = std::env::current_exe().map_err(|error| format!("无法定位拾光程序：{error}"))?;
    if current
        .parent()
        .and_then(|path| path.file_name())
        .and_then(|name| name.to_str())
        == Some("deps")
    {
        if let Some(target) = current.ancestors().nth(3) {
            let release = target.join("release").join("shiguang.exe");
            if release.exists() {
                return Ok(release);
            }
        }
    }
    Ok(current)
}

#[cfg(target_os = "windows")]
fn ensure_start_menu_shortcut(executable: &std::path::Path) -> Result<(), String> {
    use windows::{
        core::{Interface, HSTRING},
        Win32::{
            Storage::EnhancedStorage::PKEY_AppUserModel_ID,
            System::Com::{
                CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile,
                StructuredStorage::PROPVARIANT, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
                STGM_READWRITE,
            },
            UI::Shell::{IShellLinkW, PropertiesSystem::IPropertyStore, ShellLink},
        },
    };

    let app_data =
        std::env::var_os("APPDATA").ok_or_else(|| "无法定位 Windows 开始菜单".to_string())?;
    let shortcut = std::path::PathBuf::from(app_data)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join("拾光.lnk");
    if let Some(directory) = shortcut.parent() {
        std::fs::create_dir_all(directory)
            .map_err(|error| format!("无法创建开始菜单目录：{error}"))?;
    }

    let executable = executable.to_path_buf();
    std::thread::spawn(move || -> Result<(), String> {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                .ok()
                .map_err(|error| format!("无法初始化 Windows 快捷方式服务：{error}"))?;
            let result = (|| -> windows::core::Result<()> {
                let shell_link: IShellLinkW =
                    CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
                let persist: IPersistFile = shell_link.cast()?;
                let shortcut_path = HSTRING::from(shortcut.to_string_lossy().as_ref());
                if shortcut.exists() {
                    persist.Load(&shortcut_path, STGM_READWRITE)?;
                } else {
                    let executable_path = HSTRING::from(executable.to_string_lossy().as_ref());
                    shell_link.SetPath(&executable_path)?;
                    shell_link.SetDescription(&HSTRING::from("拾光 · 学习记录"))?;
                    if let Some(directory) = executable.parent() {
                        shell_link.SetWorkingDirectory(&HSTRING::from(
                            directory.to_string_lossy().as_ref(),
                        ))?;
                    }
                }
                let property_store: IPropertyStore = shell_link.cast()?;
                let app_id = PROPVARIANT::from(APP_USER_MODEL_ID);
                property_store.SetValue(&PKEY_AppUserModel_ID, &app_id)?;
                property_store.Commit()?;
                persist.Save(&shortcut_path, true)
            })();
            CoUninitialize();
            result.map_err(|error| format!("无法注册拾光开始菜单快捷方式：{error}"))
        }
    })
    .join()
    .map_err(|_| "注册拾光开始菜单快捷方式时发生异常".to_string())?
}

#[cfg(target_os = "windows")]
pub fn register_notification_source() -> Result<(), String> {
    use windows_registry::CURRENT_USER;

    let executable = notification_executable()?;
    ensure_start_menu_shortcut(&executable)?;

    let key = CURRENT_USER
        .create(format!(
            r"SOFTWARE\Classes\AppUserModelId\{APP_USER_MODEL_ID}"
        ))
        .map_err(|error| format!("无法注册 Windows 通知来源：{error}"))?;
    key.set_string("DisplayName", "拾光")
        .map_err(|error| format!("无法设置通知名称：{error}"))?;
    key.set_string("IconBackgroundColor", "0")
        .map_err(|error| format!("无法设置通知图标背景：{error}"))?;
    key.set_hstring("IconUri", &executable.as_path().into())
        .map_err(|error| format!("无法设置通知图标：{error}"))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn register_notification_source() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn show_windows_toast(body: &str) -> Result<(), String> {
    use tauri_winrt_notification::{Duration, Sound, Toast};

    register_notification_source()?;
    Toast::new(APP_USER_MODEL_ID)
        .title("拾光 · 监督模式")
        .text1(body)
        .sound(Some(Sound::Default))
        .duration(Duration::Short)
        .show()
        .map_err(|error| format!("Windows 通知发送失败：{error}"))
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn send_supervision_notification(app: tauri::AppHandle, body: String) -> Result<(), String> {
    use tauri::{Manager, UserAttentionType};

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.request_user_attention(Some(UserAttentionType::Informational));
    }
    show_windows_toast(&body)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn send_supervision_notification(_app: tauri::AppHandle, _body: String) -> Result<(), String> {
    Err("当前平台暂不支持 Windows 系统通知".to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn notification_identifier_is_stable() {
        assert_eq!(super::APP_USER_MODEL_ID, "com.studyflow.shiguang");
        assert!(super::APP_USER_MODEL_ID.len() <= 129);
    }

    #[cfg(target_os = "windows")]
    #[test]
    #[ignore = "manual Windows toast smoke test"]
    fn sends_windows_toast() {
        super::show_windows_toast("0.5.0 原生通知通道测试成功。").expect("toast should be sent");
    }
}
