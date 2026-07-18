import { invoke } from "@tauri-apps/api/core";
import type { AppData } from "../domain";

export type BackupInfo = {
  directory: string;
  latestFile: string | null;
  backupCount: number;
};

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createAutomaticBackup(data: AppData) {
  return invoke<BackupInfo>("create_auto_backup", {
    dateKey: localDateKey(),
    content: JSON.stringify(data, null, 2),
  });
}

export function getBackupInfo() {
  return invoke<BackupInfo>("get_backup_info");
}

export function openBackupDirectory() {
  return invoke<void>("open_backup_directory");
}
