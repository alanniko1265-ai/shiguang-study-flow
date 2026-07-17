import { Plus } from "lucide-react";
import type { AppData } from "../domain";
import { SessionList } from "../components/SessionList";

export function HistoryView({ data, onDelete, onOpenManual }: { data: AppData; onDelete: (id: string) => void; onOpenManual: () => void }) {
  return <div className="page-content"><header className="page-heading"><div><span className="date-line">所有认真度过的时间</span><h1>学习记录</h1></div><button className="primary-button icon-button" onClick={onOpenManual}><Plus size={18}/>补记一段</button></header><section className="history-card card"><div className="history-summary"><span>共 {data.sessions.length} 次学习</span><span>本地保存</span></div><SessionList sessions={data.sessions} categories={data.categories} onDelete={onDelete}/></section></div>;
}
