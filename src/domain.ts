export type Page = "today" | "analytics" | "history" | "settings";

export type Category = {
  id: string;
  name: string;
  color: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deviceId?: string;
};

export type StudySession = {
  id: string;
  categoryId: string;
  task: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  supervisionIdleSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deviceId?: string;
};

export type ActiveTimer = {
  categoryId: string;
  task: string;
  startedAt: string;
  accumulatedSeconds: number;
  runningSince: string | null;
  supervisionPaused?: boolean;
  supervisionPausedAt?: string | null;
  supervisionIdleSeconds?: number;
  shutdownPaused?: boolean;
};

export type AppSettings = {
  dailyGoalMinutes: number;
  weekStartsOnMonday: boolean;
  supervisionEnabled: boolean;
  supervisionIdleSeconds: number;
  updatedAt?: string;
  version?: number;
  deviceId?: string;
};

export type AppData = {
  schemaVersion: 2;
  deviceId: string;
  categories: Category[];
  sessions: StudySession[];
  activeTimer: ActiveTimer | null;
  settings: AppSettings;
};

export type DateRange = 1 | 7 | 30;

export const categoryColors = ["#b65d47", "#b58b3f", "#80627d", "#6f7785", "#a4774e", "#9a5f68"];
