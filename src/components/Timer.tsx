import { CirclePause, Play, Square } from "lucide-react";
import type { ActiveTimer, Category } from "../domain";
import { formatDuration } from "../lib/date";

type Props = {
  timer: ActiveTimer | null;
  categories: Category[];
  elapsed: number;
  onStart: (categoryId: string, task: string) => void;
  onToggle: () => void;
  onFinish: () => void;
  onDraftChange: (field: "categoryId" | "task", value: string) => void;
  draft: { categoryId: string; task: string };
};

export function FocusTimer({ timer, categories, elapsed, onStart, onToggle, onFinish, onDraftChange, draft }: Props) {
  const selected = categories.find((item) => item.id === (timer?.categoryId ?? draft.categoryId)) ?? categories[0];
  const running = Boolean(timer?.runningSince);

  return (
    <section className={`focus-card ${running ? "is-running" : ""}`}>
      <span className="focus-index">FOCUS / 01</span>
      <span className="focus-side-note">ONE THING AT A TIME</span>
      <div className="focus-head">
        <div>
          <span className="eyebrow">{timer ? (running ? "正在专注" : "已暂停") : "开始一次专注"}</span>
          <h2>{timer?.task || "把注意力留给此刻"}</h2>
        </div>
        <span className="focus-category"><i style={{ background: selected?.color }} />{selected?.name}</span>
      </div>

      <div className="timer-display" aria-live="polite">{formatDuration(elapsed)}</div>

      {!timer ? (
        <div className="timer-setup">
          <label>
            <span>这次要完成什么？</span>
            <input value={draft.task} onChange={(event) => onDraftChange("task", event.target.value)} placeholder="例如：复习高等数学第三章" maxLength={60} />
          </label>
          <label>
            <span>学习分类</span>
            <select value={draft.categoryId} onChange={(event) => onDraftChange("categoryId", event.target.value)}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <button className="primary-button start-button" onClick={() => onStart(draft.categoryId, draft.task)}><Play size={18} fill="currentColor" />开始专注</button>
        </div>
      ) : (
        <div className="timer-actions">
          <button className="secondary-button icon-button" onClick={onToggle}>
            {running ? <CirclePause size={19} /> : <Play size={19} fill="currentColor" />}
            {running ? "暂停" : "继续"}
          </button>
          <button className="primary-button icon-button" onClick={onFinish}><Square size={16} fill="currentColor" />完成并记录</button>
        </div>
      )}
    </section>
  );
}
