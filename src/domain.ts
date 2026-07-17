export type Page = "today" | "analytics" | "history" | "settings";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type StudySession = {
  id: string;
  categoryId: string;
  task: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

export type ActiveTimer = {
  categoryId: string;
  task: string;
  startedAt: string;
  accumulatedSeconds: number;
  runningSince: string | null;
};

export type AppSettings = {
  dailyGoalMinutes: number;
  weekStartsOnMonday: boolean;
};

export type AppData = {
  schemaVersion: 1;
  categories: Category[];
  sessions: StudySession[];
  activeTimer: ActiveTimer | null;
  settings: AppSettings;
};

export type DateRange = 1 | 7 | 30;

export const categoryColors = ["#b65d47", "#b58b3f", "#80627d", "#6f7785", "#a4774e", "#9a5f68"];
