import { ArrowRight, Flame, Plus } from "lucide-react";
import type { ActiveTimer, AppData } from "../domain";
import { formatMinutes, greeting } from "../lib/date";
import { currentStreak, todaySessions, totalSeconds } from "../lib/stats";
import { FocusTimer } from "../components/Timer";
import { SessionList } from "../components/SessionList";

type Props = {
  data: AppData;
  elapsed: number;
  draft: { categoryId: string; task: string };
  onDraftChange: (field: "categoryId" | "task", value: string) => void;
  onStart: (categoryId: string, task: string) => void;
  onToggle: () => void;
  onFinish: () => void;
  onDelete: (id: string) => void;
  onOpenManual: () => void;
  onShowAll: () => void;
  timer: ActiveTimer | null;
};

export function TodayView(props: Props) {
  const today = todaySessions(props.data.sessions);
  const minutes = Math.floor(totalSeconds(today) / 60);
  const goal = props.data.settings.dailyGoalMinutes;
  const percentage = Math.min(100, Math.round((minutes / goal) * 100));
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const dayNumber = Math.floor((Date.now() - startOfYear.getTime()) / 86_400_000);

  return (
    <div className="page-content today-page">
      <header className="page-heading">
        <div className="heading-copy"><span className="date-line">{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span><h1>{greeting()}，今天也稳稳地前进。</h1><p>把宏大的目标，折成今天这一页。</p></div>
        <div className="day-stamp"><small>DAY</small><strong>{dayNumber}</strong><span>{new Date().getFullYear()}</span></div>
        <button className="secondary-button icon-button" onClick={props.onOpenManual}><Plus size={18}/>补记一段</button>
      </header>

      <div className="today-grid">
        <FocusTimer timer={props.timer} categories={props.data.categories} elapsed={props.elapsed} onStart={props.onStart} onToggle={props.onToggle} onFinish={props.onFinish} onDraftChange={props.onDraftChange} draft={props.draft}/>
        <aside className="motivation-column">
          <section className="goal-card card">
            <div className="card-label"><span>今日进度 · TODAY'S PACE</span><strong>{percentage}%</strong></div>
            <div className="goal-ring" style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{formatMinutes(minutes)}</strong><span>/ {formatMinutes(goal)}</span></div>
            </div>
            <div className="progress-track"><span style={{ width: `${percentage}%` }}/></div>
            <p>{percentage >= 100 ? "今天的目标已经完成，很棒。" : `还差 ${formatMinutes(Math.max(0, goal - minutes))}，不用着急。`}</p>
          </section>
          <section className="streak-card card">
            <div className="streak-icon"><Flame size={23}/></div>
            <div><span>连续学习</span><strong>{currentStreak(props.data.sessions)} 天</strong></div>
            <p>持续比强度更重要 <span>KEEP GOING →</span></p>
          </section>
        </aside>
      </div>

      <section className="content-section">
        <div className="section-head"><div><span className="eyebrow">TODAY'S LOG · 今日足迹</span><h2>最近完成</h2></div><button className="text-button" onClick={props.onShowAll}>翻阅全部 <ArrowRight size={16}/></button></div>
        <SessionList sessions={props.data.sessions} categories={props.data.categories} onDelete={props.onDelete} limit={4}/>
      </section>
    </div>
  );
}
