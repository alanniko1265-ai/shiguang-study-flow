import { invoke } from "@tauri-apps/api/core";

export function getSystemIdleSeconds() {
  return invoke<number>("get_system_idle_seconds");
}
