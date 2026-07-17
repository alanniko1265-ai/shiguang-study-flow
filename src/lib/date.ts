export const pad = (value: number) => String(value).padStart(2, "0");

export function dayKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysAgo(days: number) {
  const date = startOfDay();
  date.setDate(date.getDate() - days);
  return date;
}

export function formatDuration(totalSeconds: number, compact = false) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (compact) return hours ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
  const seconds = Math.floor(totalSeconds % 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

export function friendlyDate(iso: string) {
  const date = new Date(iso);
  const today = dayKey(new Date());
  const yesterday = dayKey(daysAgo(1));
  const prefix = dayKey(date) === today ? "今天" : dayKey(date) === yesterday ? "昨天" : `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${prefix} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const weekday = (date: Date) => ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}
