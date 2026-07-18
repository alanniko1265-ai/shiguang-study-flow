import Database from "@tauri-apps/plugin-sql";
import type { ActiveTimer, AppData, AppSettings, Category, StudySession } from "../domain";

const DATABASE_URL = "sqlite:shiguang.db";

function isDatabaseLocked(error: unknown) {
  const message = String(error).toLowerCase();
  return message.includes("database is locked") || message.includes("(code: 5)");
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

type MetaRow = { value: string };
type CategoryRow = {
  id: string;
  name: string;
  color: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  device_id: string;
};
type SessionRow = {
  id: string;
  category_id: string;
  task: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
  version: number;
  device_id: string;
};
type SettingsRow = {
  daily_goal_minutes: number;
  week_starts_on_monday: number;
  updated_at: string;
  version: number;
  device_id: string;
};
type TimerRow = { payload: string };
type IdRow = { id: string };

export function isDesktopApp() {
  return "__TAURI_INTERNALS__" in window;
}

class SqliteRepository {
  private database: Database | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  async initialize(legacySnapshot: AppData): Promise<AppData> {
    this.database = await Database.load(DATABASE_URL);
    await this.createSchema();

    const initialized = await this.getMeta("initialized");
    if (!initialized) {
      const deviceId = legacySnapshot.deviceId || crypto.randomUUID();
      await this.withBusyRetry(() => this.setMeta("device_id", deviceId));
      await this.withBusyRetry(() => this.persist({ ...legacySnapshot, schemaVersion: 2, deviceId }));
      await this.withBusyRetry(() => this.setMeta("initialized", "true"));
      await this.withBusyRetry(() => this.setMeta("migrated_from", "local-storage-v1"));
    }

    return this.load();
  }

  save(data: AppData): Promise<void> {
    this.saveQueue = this.saveQueue.catch(() => undefined).then(() => this.withBusyRetry(() => this.persist(data)));
    return this.saveQueue;
  }

  async load(): Promise<AppData> {
    const db = this.requireDatabase();
    const deviceId = (await this.getMeta("device_id")) || crypto.randomUUID();
    if (!(await this.getMeta("device_id"))) await this.setMeta("device_id", deviceId);

    const [categoryRows, sessionRows, settingsRows, timerRows] = await Promise.all([
      db.select<CategoryRow[]>("SELECT id, name, color, archived_at, created_at, updated_at, version, device_id FROM categories WHERE deleted_at IS NULL ORDER BY created_at, id"),
      db.select<SessionRow[]>("SELECT id, category_id, task, started_at, ended_at, duration_seconds, created_at, updated_at, version, device_id FROM study_sessions WHERE deleted_at IS NULL ORDER BY ended_at DESC"),
      db.select<SettingsRow[]>("SELECT daily_goal_minutes, week_starts_on_monday, updated_at, version, device_id FROM app_settings WHERE id = 'main' LIMIT 1"),
      db.select<TimerRow[]>("SELECT payload FROM active_timer WHERE id = 'current' LIMIT 1"),
    ]);

    const categories: Category[] = categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      deviceId: row.device_id,
    }));
    const sessions: StudySession[] = sessionRows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      task: row.task,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      deviceId: row.device_id,
    }));
    const settingsRow = settingsRows[0];
    const settings: AppSettings = settingsRow ? {
      dailyGoalMinutes: settingsRow.daily_goal_minutes,
      weekStartsOnMonday: Boolean(settingsRow.week_starts_on_monday),
      updatedAt: settingsRow.updated_at,
      version: settingsRow.version,
      deviceId: settingsRow.device_id,
    } : { dailyGoalMinutes: 150, weekStartsOnMonday: true };

    let activeTimer: ActiveTimer | null = null;
    if (timerRows[0]?.payload) {
      try {
        activeTimer = JSON.parse(timerRows[0].payload) as ActiveTimer;
      } catch {
        activeTimer = null;
      }
    }

    return { schemaVersion: 2, deviceId, categories, sessions, activeTimer, settings };
  }

  private async createSchema() {
    const db = this.requireDatabase();
    const statements = [
      "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1, device_id TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS study_sessions (id TEXT PRIMARY KEY NOT NULL, category_id TEXT NOT NULL, task TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT NOT NULL, duration_seconds INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1, device_id TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS app_settings (id TEXT PRIMARY KEY NOT NULL, daily_goal_minutes INTEGER NOT NULL, week_starts_on_monday INTEGER NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, device_id TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS active_timer (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS sync_changes (change_id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, changed_at TEXT NOT NULL, device_id TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON study_sessions(ended_at)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON study_sessions(updated_at)",
      "CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at)",
      "CREATE INDEX IF NOT EXISTS idx_sync_changes_pending ON sync_changes(synced, changed_at)",
    ];
    for (const statement of statements) await this.withBusyRetry(() => db.execute(statement));
    const categoryColumns = await db.select<{ name: string }[]>("PRAGMA table_info(categories)");
    if (!categoryColumns.some((column) => column.name === "archived_at")) {
      await this.withBusyRetry(() => db.execute("ALTER TABLE categories ADD COLUMN archived_at TEXT"));
    }
    await this.withBusyRetry(() => this.setMeta("schema_version", "3"));
  }

  private async persist(data: AppData) {
    const db = this.requireDatabase();
    const now = new Date().toISOString();
      const activeCategories = await db.select<IdRow[]>("SELECT id FROM categories WHERE deleted_at IS NULL");
      const categoryIds = new Set(data.categories.map((item) => item.id));
      for (const category of data.categories) {
        const createdAt = category.createdAt ?? category.updatedAt ?? now;
        const updatedAt = category.updatedAt ?? createdAt;
        const version = category.version ?? 1;
        const deviceId = category.deviceId ?? data.deviceId;
        await db.execute(
          "INSERT INTO categories (id, name, color, archived_at, created_at, updated_at, deleted_at, version, device_id) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8) ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, archived_at = excluded.archived_at, updated_at = excluded.updated_at, deleted_at = NULL, version = excluded.version, device_id = excluded.device_id",
          [category.id, category.name, category.color, category.archivedAt ?? null, createdAt, updatedAt, version, deviceId],
        );
        await this.addChange("category", category.id, "upsert", updatedAt, deviceId);
      }
      for (const row of activeCategories) {
        if (!categoryIds.has(row.id)) await this.softDelete("categories", "category", row.id, now, data.deviceId);
      }

      const activeSessions = await db.select<IdRow[]>("SELECT id FROM study_sessions WHERE deleted_at IS NULL");
      const sessionIds = new Set(data.sessions.map((item) => item.id));
      for (const session of data.sessions) {
        const createdAt = session.createdAt ?? session.startedAt ?? now;
        const updatedAt = session.updatedAt ?? session.endedAt ?? now;
        const version = session.version ?? 1;
        const deviceId = session.deviceId ?? data.deviceId;
        await db.execute(
          "INSERT INTO study_sessions (id, category_id, task, started_at, ended_at, duration_seconds, created_at, updated_at, deleted_at, version, device_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10) ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, task = excluded.task, started_at = excluded.started_at, ended_at = excluded.ended_at, duration_seconds = excluded.duration_seconds, updated_at = excluded.updated_at, deleted_at = NULL, version = excluded.version, device_id = excluded.device_id",
          [session.id, session.categoryId, session.task, session.startedAt, session.endedAt, session.durationSeconds, createdAt, updatedAt, version, deviceId],
        );
        await this.addChange("session", session.id, "upsert", updatedAt, deviceId);
      }
      for (const row of activeSessions) {
        if (!sessionIds.has(row.id)) await this.softDelete("study_sessions", "session", row.id, now, data.deviceId);
      }

      const settingsUpdatedAt = data.settings.updatedAt ?? now;
      const settingsVersion = data.settings.version ?? 1;
      const settingsDeviceId = data.settings.deviceId ?? data.deviceId;
      await db.execute(
        "INSERT INTO app_settings (id, daily_goal_minutes, week_starts_on_monday, updated_at, version, device_id) VALUES ('main', $1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET daily_goal_minutes = excluded.daily_goal_minutes, week_starts_on_monday = excluded.week_starts_on_monday, updated_at = excluded.updated_at, version = excluded.version, device_id = excluded.device_id",
        [data.settings.dailyGoalMinutes, data.settings.weekStartsOnMonday ? 1 : 0, settingsUpdatedAt, settingsVersion, settingsDeviceId],
      );
      await this.addChange("settings", "main", "upsert", settingsUpdatedAt, settingsDeviceId);

      if (data.activeTimer) {
        await db.execute(
          "INSERT INTO active_timer (id, payload, updated_at) VALUES ('current', $1, $2) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
          [JSON.stringify(data.activeTimer), now],
        );
      } else {
        await db.execute("DELETE FROM active_timer WHERE id = 'current'");
      }

      await this.setMeta("last_write_at", now);
  }

  private async withBusyRetry<T>(operation: () => Promise<T>): Promise<T> {
    const delays = [80, 160, 320, 640, 1280];
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!isDatabaseLocked(error) || attempt >= delays.length) throw error;
        await wait(delays[attempt]);
      }
    }
  }

  private async softDelete(table: "categories" | "study_sessions", entityType: string, id: string, changedAt: string, deviceId: string) {
    const db = this.requireDatabase();
    await db.execute(`UPDATE ${table} SET deleted_at = $1, updated_at = $1, version = version + 1, device_id = $2 WHERE id = $3 AND deleted_at IS NULL`, [changedAt, deviceId, id]);
    await this.addChange(entityType, id, "delete", changedAt, deviceId);
  }

  private async addChange(entityType: string, entityId: string, operation: "upsert" | "delete", changedAt: string, deviceId: string) {
    const changeId = `${deviceId}:${entityType}:${entityId}:${operation}:${changedAt}`;
    await this.requireDatabase().execute(
      "INSERT OR IGNORE INTO sync_changes (change_id, entity_type, entity_id, operation, changed_at, device_id, synced) VALUES ($1, $2, $3, $4, $5, $6, 0)",
      [changeId, entityType, entityId, operation, changedAt, deviceId],
    );
  }

  private async getMeta(key: string) {
    const rows = await this.requireDatabase().select<MetaRow[]>("SELECT value FROM app_meta WHERE key = $1 LIMIT 1", [key]);
    return rows[0]?.value ?? null;
  }

  private async setMeta(key: string, value: string) {
    await this.requireDatabase().execute(
      "INSERT INTO app_meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  }

  private requireDatabase() {
    if (!this.database) throw new Error("数据库尚未初始化");
    return this.database;
  }
}

export const sqliteRepository = new SqliteRepository();
