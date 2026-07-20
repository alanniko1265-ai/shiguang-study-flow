import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function prepareSystemNotifications() {
  if (!("__TAURI_INTERNALS__" in window)) return false;
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

export async function sendSupervisionNotification(body: string) {
  if (!("__TAURI_INTERNALS__" in window) || !(await isPermissionGranted())) return false;
  sendNotification({ title: "拾光 · 监督模式", body });
  return true;
}
