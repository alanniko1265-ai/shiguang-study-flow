import type { AppData, Category, StudySession } from "../domain";

const categories: Category[] = [
  { id: "major", name: "专业学习", color: "#b65d47" },
  { id: "language", name: "语言学习", color: "#b58b3f" },
  { id: "reading", name: "阅读", color: "#80627d" },
  { id: "project", name: "项目实践", color: "#6f7785" },
];

function at(daysBack: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function session(index: number, daysBack: number, hour: number, minutes: number, categoryId: string, task: string): StudySession {
  const start = at(daysBack, hour, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return {
    id: `demo-${index}`,
    categoryId,
    task,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationSeconds: minutes * 60,
  };
}

export function createDemoData(): AppData {
  const sessions = [
    session(1, 0, 9, 52, "major", "高等数学 · 定积分"),
    session(2, 0, 14, 38, "language", "英语精读 · Unit 6"),
    session(3, 1, 10, 75, "project", "课程项目 · 数据整理"),
    session(4, 1, 20, 32, "reading", "《深度工作》第三章"),
    session(5, 2, 8, 64, "major", "线性代数 · 特征值"),
    session(6, 3, 15, 48, "language", "听力与跟读"),
    session(7, 4, 9, 92, "major", "概率论习题"),
    session(8, 5, 19, 46, "reading", "论文阅读与笔记"),
    session(9, 6, 13, 80, "project", "课程项目 · 页面实现"),
    session(10, 7, 10, 55, "major", "高等数学复习"),
    session(11, 9, 16, 40, "language", "单词复习"),
    session(12, 11, 9, 70, "project", "算法练习"),
  ];
  return {
    schemaVersion: 2,
    deviceId: crypto.randomUUID(),
    categories,
    sessions,
    activeTimer: null,
    settings: { dailyGoalMinutes: 150, weekStartsOnMonday: true, supervisionEnabled: false },
  };
}
