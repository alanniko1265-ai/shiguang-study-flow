import type { AppData } from "../domain";
import { createDemoData } from "./demo";

const STORAGE_KEY = "shiguang.study-flow.v1";
const DEVICE_KEY = "shiguang.device-id";
const LEGACY_COLOR_MAP: Record<string, string> = {
  "#5f7c6b": "#b65d47",
  "#c47f61": "#b58b3f",
  "#8b78a8": "#80627d",
  "#4f7f99": "#6f7785",
  "#b7924c": "#a4774e",
  "#9d6670": "#9a5f68",
};

export interface StorageAdapter {
  load(): AppData;
  save(data: AppData): void;
  clear(): void;
}

type ImportShape = Partial<Omit<AppData, "schemaVersion">> & { schemaVersion?: number };

function getDeviceId(preferred?: string) {
  const stored = localStorage.getItem(DEVICE_KEY);
  if (stored) return stored;
  const id = preferred || crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function stampData(data: AppData): AppData {
  const now = new Date().toISOString();
  const deviceId = getDeviceId(data.deviceId);
  return {
    ...data,
    schemaVersion: 2,
    deviceId,
    categories: data.categories.map((category) => ({
      ...category,
      color: LEGACY_COLOR_MAP[category.color.toLowerCase()] ?? category.color,
      createdAt: category.createdAt ?? category.updatedAt ?? now,
      updatedAt: category.updatedAt ?? category.createdAt ?? now,
      version: category.version ?? 1,
      deviceId: category.deviceId ?? deviceId,
    })),
    sessions: data.sessions.map((session) => ({
      ...session,
      createdAt: session.createdAt ?? session.startedAt ?? now,
      updatedAt: session.updatedAt ?? session.endedAt ?? now,
      version: session.version ?? 1,
      deviceId: session.deviceId ?? deviceId,
    })),
    settings: {
      ...data.settings,
      updatedAt: data.settings.updatedAt ?? now,
      version: data.settings.version ?? 1,
      deviceId: data.settings.deviceId ?? deviceId,
    },
  };
}

export function normalizeData(value: unknown, preferredDeviceId?: string): AppData {
  if (!value || typeof value !== "object") throw new Error("文件格式无效");
  const data = value as ImportShape;
  if (![1, 2].includes(data.schemaVersion ?? 0) || !Array.isArray(data.categories) || !Array.isArray(data.sessions) || !data.settings) {
    throw new Error("这不是有效的拾光备份文件");
  }
  const deviceId = getDeviceId(preferredDeviceId ?? data.deviceId);
  return stampData({
    schemaVersion: 2,
    deviceId,
    categories: data.categories,
    sessions: data.sessions,
    activeTimer: data.activeTimer ?? null,
    settings: data.settings,
  });
}

class LocalStorageAdapter implements StorageAdapter {
  load(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = createDemoData();
      demo.deviceId = getDeviceId(demo.deviceId);
      return stampData(demo);
    }
    try {
      return normalizeData(JSON.parse(raw));
    } catch {
      const demo = createDemoData();
      demo.deviceId = getDeviceId(demo.deviceId);
      return stampData(demo);
    }
  }

  save(data: AppData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

export function validateImport(value: unknown, localDeviceId?: string): AppData {
  return normalizeData(value, localDeviceId);
}
