import type { AppData } from "../domain";
import { createDemoData } from "./demo";

const STORAGE_KEY = "shiguang.study-flow.v1";
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

class LocalStorageAdapter implements StorageAdapter {
  load(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoData();
    try {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.sessions)) throw new Error("Invalid schema");
      return {
        ...parsed,
        categories: parsed.categories.map((category) => ({
          ...category,
          color: LEGACY_COLOR_MAP[category.color.toLowerCase()] ?? category.color,
        })),
      };
    } catch {
      return createDemoData();
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

export function validateImport(value: unknown): AppData {
  if (!value || typeof value !== "object") throw new Error("文件格式无效");
  const data = value as Partial<AppData>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.categories) || !Array.isArray(data.sessions) || !data.settings) {
    throw new Error("这不是有效的拾光备份文件");
  }
  return data as AppData;
}
