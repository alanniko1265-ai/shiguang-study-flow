import { invoke } from "@tauri-apps/api/core";

export async function prepareSystemNotifications() {
  if (!("__TAURI_INTERNALS__" in window)) return false;
  await invoke("send_supervision_notification", {
    body: "监督模式已开启；自动暂停和继续会在这里通知你。",
  });
  return true;
}

export async function sendSupervisionNotification(body: string) {
  if (!("__TAURI_INTERNALS__" in window)) return false;
  await invoke("send_supervision_notification", { body });
  return true;
}
