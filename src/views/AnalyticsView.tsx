import { CalendarDays, Clock3, Layers3, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppData, DateRange } from "../domain";
import { formatDuration } from "../lib/date";
import { currentStreak, sessionsInRange, totalSeconds } from "../lib/stats";
import { BarChart, DonutChart, Heatmap } from "../components/Charts";
import type { DistributionMode } from "../components/Charts";

export function AnalyticsView({ data }: { data: AppData }) {
  const [range, setRange] = useState<DateRange>(7);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>("category");
  const sessions = useMemo(() => sessionsInRange(data.sessions, range), [data.sessions, range]);
  const seconds = totalSeconds(sessions);
  const longest = Math.max(...sessions.map((item) => item.durationSeconds), 0);

  return (
    <div className="page-content">
      <header className="page-heading analytics-heading">
        <div><span className="date-line">看见投入，理解节奏</span><h1>学习统计</h1></div>
        <div className="range-tabs">
          {([[1, "今日"], [7, "近 7 天"], [30, "近 30 天"]] as const).map(([value, label]) => <button className={range === value ? "active" : ""} onClick={() => setRange(value)} key={value}>{label}</button>)}
        </div>
      </header>

      <div className="metric-grid">
        <Metric icon={<Clock3/>} label="总投入" value={formatDuration(seconds, true)} note={`日均 ${formatDuration(seconds / range, true)}`}/>
        <Metric icon={<Layers3/>} label="学习次数" value={`${sessions.length} 次`} note="每一次都算数"/>
        <Metric icon={<Sparkles/>} label="最长单次" value={formatDuration(longest, true)} note="保持舒适节奏"/>
        <Metric icon={<CalendarDays/>} label="连续学习" value={`${currentStreak(data.sessions)} 天`} note="稳定积累中"/>
      </div>

      <div className="analytics-grid">
        <section className="chart-card card chart-wide"><div className="chart-title"><div><span className="eyebrow">时间趋势</span><h2>每日投入</h2></div><span className="chart-note">{range === 30 ? "展示最近 14 天" : "按自然日统计"}</span></div><BarChart sessions={sessions} days={range}/></section>
        <section className="chart-card card"><div className="chart-title"><div><span className="eyebrow">精力分布</span><h2>{distributionMode === "category" ? "分类占比" : "项目占比"}</h2></div><div className="chart-mode-tabs" aria-label="占比统计方式"><button className={distributionMode === "category" ? "active" : ""} onClick={() => setDistributionMode("category")}>分类</button><button className={distributionMode === "task" ? "active" : ""} onClick={() => setDistributionMode("task")}>项目</button></div></div><DonutChart sessions={sessions} categories={data.categories} mode={distributionMode}/></section>
      </div>

      <section className="chart-card card heat-card"><div className="chart-title"><div><span className="eyebrow">长期节奏</span><h2>近 12 周学习足迹</h2></div><span className="chart-note">颜色越深，投入越多</span></div><Heatmap sessions={data.sessions}/></section>
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="metric-card card"><span className="metric-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
