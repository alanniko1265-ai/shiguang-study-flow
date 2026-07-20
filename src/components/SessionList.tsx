import { Clock3, Pencil, Trash2 } from "lucide-react";
import type { Category, StudySession } from "../domain";
import { formatDuration, friendlyDate } from "../lib/date";

export function SessionList({ sessions, categories, onDelete, onEdit, limit, emptyTitle = "还没有记录", emptyText = "完成一次专注后，学习足迹会出现在这里。" }: { sessions: StudySession[]; categories: Category[]; onDelete: (id: string) => void; onEdit?: (session: StudySession) => void; limit?: number; emptyTitle?: string; emptyText?: string }) {
  const visible = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
  if (!visible.length) return <div className="empty-state"><Clock3 size={28}/><h3>{emptyTitle}</h3><p>{emptyText}</p></div>;
  return (
    <div className="session-list">
      {visible.map((session, index) => {
        const category = categories.find((item) => item.id === session.categoryId);
        return (
          <article className="session-row" key={session.id}>
            <span className="session-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="session-marker" style={{ background: category?.color ?? "#888" }} />
            <div className="session-main">
              <strong>{session.task || "未命名学习"}</strong>
              <span>{category?.name ?? "未分类"} · {friendlyDate(session.startedAt)}{session.supervisionIdleSeconds ? ` · 扣除空闲 ${formatDuration(session.supervisionIdleSeconds, true)}` : ""}</span>
            </div>
            <time>{formatDuration(session.durationSeconds, true)}</time>
            <div className="session-actions">
              {onEdit && <button className="ghost-icon" onClick={() => onEdit(session)} aria-label="编辑记录"><Pencil size={16}/></button>}
              <button className="ghost-icon danger" onClick={() => onDelete(session.id)} aria-label="删除记录"><Trash2 size={17}/></button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
