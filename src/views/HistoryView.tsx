import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppData, StudySession } from "../domain";
import { SessionList } from "../components/SessionList";

export function HistoryView({ data, onDelete, onEdit, onOpenManual }: { data: AppData; onDelete: (id: string) => void; onEdit: (session: StudySession) => void; onOpenManual: () => void }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [range, setRange] = useState("all");
  const filteredSessions = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const rangeStart = range === "today"
      ? todayStart
      : range === "7days"
        ? todayStart - 6 * 86_400_000
        : range === "30days"
          ? todayStart - 29 * 86_400_000
          : 0;

    return data.sessions.filter((session) => {
      if (categoryId !== "all" && session.categoryId !== categoryId) return false;
      if (rangeStart && new Date(session.startedAt).getTime() < rangeStart) return false;
      if (!keyword) return true;
      const category = data.categories.find((item) => item.id === session.categoryId);
      return `${session.task} ${category?.name ?? ""}`.toLocaleLowerCase().includes(keyword);
    });
  }, [data.sessions, data.categories, query, categoryId, range]);
  const hasFilters = Boolean(query.trim()) || categoryId !== "all" || range !== "all";
  const clearFilters = () => {
    setQuery("");
    setCategoryId("all");
    setRange("all");
  };

  return <div className="page-content"><header className="page-heading"><div><span className="date-line">所有认真度过的时间</span><h1>学习记录</h1></div><button className="primary-button icon-button" onClick={onOpenManual}><Plus size={18}/>补记一段</button></header><section className="history-card card"><div className="history-filters"><label className="history-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学习内容或分类" aria-label="搜索学习记录"/></label><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="按分类筛选"><option value="all">全部分类</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="按时间筛选"><option value="all">全部时间</option><option value="today">今天</option><option value="7days">最近 7 天</option><option value="30days">最近 30 天</option></select>{hasFilters && <button className="clear-filters" onClick={clearFilters}><X size={15}/>清除</button>}</div><div className="history-summary"><span>{hasFilters ? `显示 ${filteredSessions.length} / 共 ${data.sessions.length} 次` : `共 ${data.sessions.length} 次学习`}</span><span>本地保存</span></div><SessionList sessions={filteredSessions} categories={data.categories} onDelete={onDelete} onEdit={onEdit} emptyTitle={hasFilters ? "没有匹配的记录" : undefined} emptyText={hasFilters ? "换个关键词或筛选条件试试。" : undefined}/></section></div>;
}
