import type { Category, DateRange, StudySession } from "../domain";
import { dayKey, daysAgo, startOfDay } from "./date";

export function sessionsInRange(sessions: StudySession[], range: DateRange) {
  const start = daysAgo(range - 1).getTime();
  return sessions.filter((item) => new Date(item.startedAt).getTime() >= start);
}

export function totalSeconds(sessions: StudySession[]) {
  return sessions.reduce((sum, item) => sum + item.durationSeconds, 0);
}

export function todaySessions(sessions: StudySession[]) {
  const today = dayKey(new Date());
  return sessions.filter((item) => dayKey(item.startedAt) === today);
}

export function dailySeries(sessions: StudySession[], days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = daysAgo(days - index - 1);
    const seconds = totalSeconds(sessions.filter((item) => dayKey(item.startedAt) === dayKey(date)));
    return { date, seconds };
  });
}

export function categorySeries(sessions: StudySession[], categories: Category[]) {
  const total = totalSeconds(sessions);
  return categories
    .map((category) => {
      const seconds = totalSeconds(sessions.filter((item) => item.categoryId === category.id));
      return { ...category, seconds, percentage: total ? (seconds / total) * 100 : 0 };
    })
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

const taskColors = ["#b65d47", "#b58b3f", "#80627d", "#6f7785", "#a4774e", "#9a5f68", "#6e8270", "#5f7890", "#9a7651", "#8b6f62"];

function taskColor(name: string) {
  const hash = [...name].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return taskColors[Math.abs(hash) % taskColors.length];
}

export function taskSeries(sessions: StudySession[]) {
  const total = totalSeconds(sessions);
  const grouped = new Map<string, { name: string; seconds: number }>();
  for (const session of sessions) {
    const name = session.task.trim() || "未命名学习";
    const current = grouped.get(name);
    grouped.set(name, { name, seconds: (current?.seconds ?? 0) + session.durationSeconds });
  }
  return [...grouped.values()]
    .sort((a, b) => b.seconds - a.seconds)
    .map((item) => ({
      id: `task-${item.name}`,
      name: item.name,
      seconds: item.seconds,
      percentage: total ? (item.seconds / total) * 100 : 0,
      color: taskColor(item.name),
    }));
}

export function currentStreak(sessions: StudySession[]) {
  const keys = new Set(sessions.map((item) => dayKey(item.startedAt)));
  let cursor = startOfDay();
  if (!keys.has(dayKey(cursor))) cursor = daysAgo(1);
  let streak = 0;
  while (keys.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function heatmapData(sessions: StudySession[], weeks = 12) {
  const today = startOfDay();
  const endOffset = (today.getDay() + 6) % 7;
  const endMonday = new Date(today);
  endMonday.setDate(today.getDate() - endOffset);
  const first = new Date(endMonday);
  first.setDate(first.getDate() - (weeks - 1) * 7);
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const seconds = date <= today ? totalSeconds(sessions.filter((item) => dayKey(item.startedAt) === dayKey(date))) : -1;
    return { date, seconds };
  });
}
