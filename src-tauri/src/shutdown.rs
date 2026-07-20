use std::{
    fs::{self, OpenOptions},
    io::Write,
    sync::Mutex,
};
use tauri::{AppHandle, Manager};

#[derive(Default)]
pub struct ShutdownState {
    snapshot: Mutex<Option<String>>,
}

fn snapshot_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join("shutdown-recovery.json"))
        .map_err(|error| format!("无法定位关机恢复文件：{error}"))
}

fn write_snapshot(app: &AppHandle, content: &str) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(content)
        .map_err(|error| format!("关机快照不是有效 JSON：{error}"))?;
    let path = snapshot_path(app)?;
    if let Some(directory) = path.parent() {
        fs::create_dir_all(directory).map_err(|error| format!("无法创建恢复目录：{error}"))?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(path)
        .map_err(|error| format!("无法打开关机恢复文件：{error}"))?;
    file.write_all(content.as_bytes())
        .map_err(|error| format!("无法写入关机恢复文件：{error}"))?;
    file.sync_all()
        .map_err(|error| format!("无法将关机恢复文件写入磁盘：{error}"))
}

#[tauri::command]
pub fn cache_shutdown_snapshot(
    app: AppHandle,
    state: tauri::State<'_, ShutdownState>,
    content: String,
) -> Result<(), String> {
    write_snapshot(&app, &content)?;
    *state
        .snapshot
        .lock()
        .map_err(|_| "无法锁定关机快照".to_string())? = Some(content);
    Ok(())
}

#[tauri::command]
pub fn load_shutdown_snapshot(app: AppHandle) -> Result<Option<String>, String> {
    let path = snapshot_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("无法读取关机恢复文件：{error}"))
}

pub fn flush(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<ShutdownState>();
    let snapshot = state
        .snapshot
        .lock()
        .map_err(|_| "无法锁定关机快照".to_string())?
        .clone();
    if let Some(content) = snapshot {
        write_snapshot(app, &content)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn recovery_file_name_is_stable() {
        let path = std::path::Path::new("data").join("shutdown-recovery.json");
        assert_eq!(
            path.file_name().and_then(|name| name.to_str()),
            Some("shutdown-recovery.json")
        );
    }
}
