import { invoke } from "@tauri-apps/api/core";

export function getSystemIdleSeconds() {
  return invoke<number>("get_system_idle_seconds");
}

export type SystemActivity = {
  idleSeconds: number;
  activeMilliseconds: number;
};

export function getSystemActivity() {
  return invoke<SystemActivity>("get_system_activity");
}
