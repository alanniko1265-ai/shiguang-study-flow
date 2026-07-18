use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, Manager};

const BACKUP_PREFIX: &str = "shiguang-auto-backup-";
const BACKUP_SUFFIX: &str = ".json";
const BACKUP_LIMIT: usize = 14;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    directory: String,
    latest_file: Option<String>,
    backup_count: usize,
}

fn backup_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("backups"))
        .map_err(|error| format!("无法定位备份目录：{error}"))
}

fn backup_files(directory: &Path) -> Result<Vec<PathBuf>, String> {
    if !directory.exists() {
        return Ok(Vec::new());
    }

    let mut files = fs::read_dir(directory)
        .map_err(|error| format!("无法读取备份目录：{error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| {
                    name.starts_with(BACKUP_PREFIX) && name.ends_with(BACKUP_SUFFIX)
                })
        })
        .collect::<Vec<_>>();
    files.sort();
    Ok(files)
}

fn describe(directory: &Path) -> Result<BackupInfo, String> {
    let files = backup_files(directory)?;
    Ok(BackupInfo {
        directory: directory.to_string_lossy().into_owned(),
        latest_file: files
            .last()
            .and_then(|path| path.file_name())
            .and_then(|name| name.to_str())
            .map(str::to_owned),
        backup_count: files.len(),
    })
}

fn valid_date_key(value: &str) -> bool {
    value.len() == 10
        && value.chars().enumerate().all(|(index, character)| {
            if index == 4 || index == 7 {
                character == '-'
            } else {
                character.is_ascii_digit()
            }
        })
}

#[tauri::command]
pub fn create_auto_backup(
    app: AppHandle,
    date_key: String,
    content: String,
) -> Result<BackupInfo, String> {
    if !valid_date_key(&date_key) {
        return Err("备份日期格式无效".to_string());
    }
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|error| format!("备份内容不是有效的 JSON：{error}"))?;

    let directory = backup_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建备份目录：{error}"))?;
    let file_path = directory.join(format!("{BACKUP_PREFIX}{date_key}{BACKUP_SUFFIX}"));
    fs::write(&file_path, content).map_err(|error| format!("无法写入自动备份：{error}"))?;

    let files = backup_files(&directory)?;
    let remove_count = files.len().saturating_sub(BACKUP_LIMIT);
    for old_file in files.iter().take(remove_count) {
        fs::remove_file(old_file).map_err(|error| format!("无法清理旧备份：{error}"))?;
    }

    describe(&directory)
}

#[tauri::command]
pub fn get_backup_info(app: AppHandle) -> Result<BackupInfo, String> {
    let directory = backup_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建备份目录：{error}"))?;
    describe(&directory)
}

#[tauri::command]
pub fn open_backup_directory(app: AppHandle) -> Result<(), String> {
    let directory = backup_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建备份目录：{error}"))?;

    #[cfg(target_os = "windows")]
    Command::new("explorer.exe")
        .arg(&directory)
        .spawn()
        .map_err(|error| format!("无法打开备份目录：{error}"))?;

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&directory)
        .spawn()
        .map_err(|error| format!("无法打开备份目录：{error}"))?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&directory)
        .spawn()
        .map_err(|error| format!("无法打开备份目录：{error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::valid_date_key;

    #[test]
    fn validates_backup_date_key() {
        assert!(valid_date_key("2026-07-18"));
        assert!(!valid_date_key("2026-7-18"));
        assert!(!valid_date_key("../../data"));
    }
}
