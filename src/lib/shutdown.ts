import { invoke } from "@tauri-apps/api/core";
import type { AppData } from "../domain";

export function cacheShutdownSnapshot(data: AppData) {
  return invoke<void>("cache_shutdown_snapshot", {
    content: JSON.stringify(data),
  });
}

export function loadShutdownSnapshot() {
  return invoke<string | null>("load_shutdown_snapshot");
}
