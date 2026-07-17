import type { Category, StudySession } from "../domain";
import { categorySeries, dailySeries, heatmapData } from "../lib/stats";
import { formatDuration, weekday } from "../lib/date";

export function DonutChart({ sessions, categories }: { sessions: StudySession[]; categories: Category[] }) {
  const data = categorySeries(sessions, categories);
  let offset = 0;
  const gradient = data.length
    ? `conic-gradient(${data.map((item) => {
        const start = offset;
        offset += item.percentage;
        return `${item.color} ${start}% ${offset}%`;
      }).join(", ")})`
    : "conic-gradient(#e8e6de 0 100%)";

  return (
    <div className="donut-layout">
      <div className="donut" style={{ background: gradient }}>
        <div className="donut-hole">
          <strong>{data.length}</strong>
          <span>个领域</span>
        </div>
      </div>
      <div className="legend">
        {data.length ? data.map((item) => (
          <div className="legend-row" key={item.id}>
            <span className="legend-dot" style={{ background: item.color }} />
            <span className="legend-name">{item.name}</span>
            <strong>{Math.round(item.percentage)}%</strong>
            <small>{formatDuration(item.seconds, true)}</small>
          </div>
        )) : <p className="muted">这个时间段还没有学习记录</p>}
      </div>
    </div>
  );
}

export function BarChart({ sessions, days }: { sessions: StudySession[]; days: number }) {
  const displayDays = days === 30 ? 14 : days;
  const data = dailySeries(sessions, displayDays);
  const max = Math.max(...data.map((item) => item.seconds), 1);
  return (
    <div className="bar-chart" aria-label="每日学习时长柱状图">
      {data.map((item, index) => (
        <div className="bar-column" key={item.date.toISOString()} title={`${item.date.getMonth() + 1}月${item.date.getDate()}日 · ${formatDuration(item.seconds, true)}`}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${Math.max(item.seconds ? 8 : 2, (item.seconds / max) * 100)}%`, animationDelay: `${index * 35}ms` }} />
          </div>
          <span>{days === 7 ? `周${weekday(item.date)}` : `${item.date.getMonth() + 1}/${item.date.getDate()}`}</span>
        </div>
      ))}
    </div>
  );
}

export function Heatmap({ sessions }: { sessions: StudySession[] }) {
  const data = heatmapData(sessions);
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" aria-label="近十二周学习热力图">
        {data.map((item) => {
          const minutes = item.seconds / 60;
          const level = item.seconds < 0 ? "future" : minutes === 0 ? "zero" : minutes < 30 ? "one" : minutes < 60 ? "two" : minutes < 120 ? "three" : "four";
          return <span key={item.date.toISOString()} className={`heat-cell ${level}`} title={`${item.date.getMonth() + 1}月${item.date.getDate()}日 · ${item.seconds > 0 ? formatDuration(item.seconds, true) : "无记录"}`} />;
        })}
      </div>
      <div className="heat-legend"><span>少</span><i className="heat-cell zero"/><i className="heat-cell one"/><i className="heat-cell two"/><i className="heat-cell three"/><i className="heat-cell four"/><span>多</span></div>
    </div>
  );
}
