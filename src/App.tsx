import { BarChart3, BookOpen, Clock3, History, Minus, Settings, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ActiveTimer, AppData, Category, Page, StudySession } from "./domain";
import { storage, validateImport } from "./lib/storage";
import { Modal } from "./components/Modal";
import { TodayView } from "./views/TodayView";
import { AnalyticsView } from "./views/AnalyticsView";
import { HistoryView } from "./views/HistoryView";
import { SettingsView } from "./views/SettingsView";

const pages = [
  { id: "today" as const, label: "今日", icon: Clock3 },
  { id: "analytics" as const, label: "统计", icon: BarChart3 },
  { id: "history" as const, label: "记录", icon: History },
  { id: "settings" as const, label: "设置", icon: Settings },
];

export default function App() {
  const [data, setData] = useState<AppData>(() => storage.load());
  const [page, setPage] = useState<Page>("today");
  const [elapsed, setElapsed] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [undoSession, setUndoSession] = useState<StudySession | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState(() => ({ categoryId: data.categories[0]?.id ?? "", task: "" }));

  useEffect(() => storage.save(data), [data]);
  useEffect(() => {
    const update = () => {
      const timer = data.activeTimer;
      setElapsed(timer ? timer.accumulatedSeconds + (timer.runningSince ? Math.floor((Date.now() - new Date(timer.runningSince).getTime()) / 1000) : 0) : 0);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [data.activeTimer]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!undoSession) return;
    const id = window.setTimeout(() => setUndoSession(null), 5000);
    return () => window.clearTimeout(id);
  }, [undoSession]);

  const updateData = (recipe: (current: AppData) => AppData) => setData((current) => recipe(current));
  const startTimer = (categoryId: string, task: string) => {
    const now = new Date().toISOString();
    const timer: ActiveTimer = { categoryId, task: task.trim() || "自由学习", startedAt: now, accumulatedSeconds: 0, runningSince: now };
    updateData((current) => ({ ...current, activeTimer: timer }));
  };
  const toggleTimer = () => updateData((current) => {
    const timer = current.activeTimer;
    if (!timer) return current;
    if (timer.runningSince) {
      const added = Math.floor((Date.now() - new Date(timer.runningSince).getTime()) / 1000);
      return { ...current, activeTimer: { ...timer, accumulatedSeconds: timer.accumulatedSeconds + added, runningSince: null } };
    }
    return { ...current, activeTimer: { ...timer, runningSince: new Date().toISOString() } };
  });
  const finishTimer = () => {
    if (!data.activeTimer) return;
    const seconds = elapsed;
    if (seconds < 10) {
      updateData((current) => ({ ...current, activeTimer: null }));
      setToast("时间太短，本次未记录");
      return;
    }
    const timer = data.activeTimer;
    const session: StudySession = { id: crypto.randomUUID(), categoryId: timer.categoryId, task: timer.task, startedAt: timer.startedAt, endedAt: new Date().toISOString(), durationSeconds: seconds };
    updateData((current) => ({ ...current, sessions: [session, ...current.sessions], activeTimer: null }));
    setDraft((current) => ({ ...current, task: "" }));
    setToast("已收好这段专注时间");
  };
  const deleteSession = (id: string) => {
    const target = data.sessions.find((item) => item.id === id);
    if (!target) return;
    updateData((current) => ({ ...current, sessions: current.sessions.filter((item) => item.id !== id) }));
    setUndoSession(target);
    setToast("");
  };
  const undoDelete = () => {
    if (!undoSession) return;
    updateData((current) => ({ ...current, sessions: [undoSession, ...current.sessions] }));
    setUndoSession(null);
    setToast("记录已恢复");
  };
  const exportData = async () => {
    const fileName = `拾光备份-${new Date().toISOString().slice(0, 10)}.json`;
    const content = JSON.stringify(data, null, 2);
    try {
      if ("__TAURI_INTERNALS__" in window) {
        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: "拾光 JSON 备份", extensions: ["json"] }],
        });
        if (!filePath) return;
        await writeTextFile(filePath, content);
        setExportResult(filePath);
        return;
      }
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setExportResult(`系统“下载”文件夹中的 ${fileName}`);
    } catch (error) {
      setToast(error instanceof Error ? `导出失败：${error.message}` : "导出失败，请重试");
    }
  };
  const importData = async (file: File) => {
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      setData(imported);
      setToast("备份已恢复");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "导入失败");
    }
  };

  const content = useMemo(() => {
    if (page === "analytics") return <AnalyticsView data={data}/>;
    if (page === "history") return <HistoryView data={data} onDelete={deleteSession} onOpenManual={() => setManualOpen(true)}/>;
    if (page === "settings") return <SettingsView data={data} onGoalChange={(minutes) => updateData((current) => ({ ...current, settings: { ...current.settings, dailyGoalMinutes: Math.max(10, minutes || 10) } }))} onAddCategory={(category) => updateData((current) => ({ ...current, categories: [...current.categories, category] }))} onExport={exportData} onImport={importData} onReset={() => setResetOpen(true)}/>;
    return <TodayView data={data} elapsed={elapsed} draft={draft} timer={data.activeTimer} onDraftChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))} onStart={startTimer} onToggle={toggleTimer} onFinish={finishTimer} onDelete={deleteSession} onOpenManual={() => setManualOpen(true)} onShowAll={() => setPage("history")}/>;
  }, [page, data, elapsed, draft]);

  return (
    <div className="app-shell">
      <AppTitleBar />
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("today")}><span><BookOpen size={21}/></span><div><strong>拾光</strong><small>STUDY LEDGER</small></div></button>
        <nav>{pages.map((item, index) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><small>0{index + 1}</small><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-quote"><small>今日签 · DAILY NOTE</small><p>你不需要看见整座楼梯，<br/>只需迈出第一步。</p><span>拾</span></div>
      </aside>
      <main>{content}</main>
      <nav className="bottom-nav">{pages.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><item.icon size={20}/><span>{item.label}</span></button>)}</nav>
      {manualOpen && <ManualSessionModal categories={data.categories} onClose={() => setManualOpen(false)} onSave={(session) => { updateData((current) => ({ ...current, sessions: [session, ...current.sessions] })); setManualOpen(false); setToast("补记成功"); }}/>} 
      {resetOpen && <ConfirmModal title="清空学习数据？" description="全部学习记录与正在进行的计时将被清除。分类和每日目标设置会保留，此操作无法撤销。" confirmLabel="确认清空" onClose={() => setResetOpen(false)} onConfirm={() => { setData((current) => ({ ...current, sessions: [], activeTimer: null })); setResetOpen(false); setToast("学习数据已清空"); }}/>} 
      {exportResult && <Modal title="备份已保存" onClose={() => setExportResult(null)}><div className="export-result"><p>文件保存在：</p><code>{exportResult}</code><div className="modal-actions"><button className="primary-button" onClick={() => setExportResult(null)}>知道了</button></div></div></Modal>}
      {toast && <div className="toast" role="status">{toast}</div>}
      {undoSession && <div className="undo-toast" role="status"><span><strong>已移除</strong>{undoSession.task}</span><button onClick={undoDelete}>撤销</button></div>}
    </div>
  );
}

function AppTitleBar() {
  const runWindowAction = async (action: "minimize" | "maximize" | "close") => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    const appWindow = getCurrentWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  };
  return <header className="app-titlebar" data-tauri-drag-region>
    <div className="titlebar-mark" data-tauri-drag-region><i/>拾光手记 <span>·</span> 记录投入，看见生长</div>
    <div className="window-actions">
      <button onClick={() => runWindowAction("minimize")} aria-label="最小化"><Minus size={15}/></button>
      <button onClick={() => runWindowAction("maximize")} aria-label="最大化"><Square size={12}/></button>
      <button className="window-close" onClick={() => runWindowAction("close")} aria-label="关闭"><X size={16}/></button>
    </div>
  </header>;
}

function ConfirmModal({ title, description, confirmLabel, onClose, onConfirm }: { title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} onClose={onClose}><div className="confirm-content"><p>{description}</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div></div></Modal>;
}

function ManualSessionModal({ categories, onClose, onSave }: { categories: Category[]; onClose: () => void; onSave: (session: StudySession) => void }) {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ task: "", categoryId: categories[0]?.id ?? "", endedAt: local, minutes: 30 });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const end = new Date(form.endedAt);
    const seconds = Math.max(60, form.minutes * 60);
    onSave({ id: crypto.randomUUID(), task: form.task.trim() || "补记学习", categoryId: form.categoryId, endedAt: end.toISOString(), startedAt: new Date(end.getTime() - seconds * 1000).toISOString(), durationSeconds: seconds });
  };
  return <Modal title="补记学习" onClose={onClose}><form className="modal-form" onSubmit={submit}><label><span>学习内容</span><input autoFocus value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} placeholder="完成了什么？"/></label><div className="form-row"><label><span>分类</span><select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>时长（分钟）</span><input type="number" min="1" max="1440" value={form.minutes} onChange={(event) => setForm({ ...form, minutes: Number(event.target.value) })}/></label></div><label><span>结束时间</span><input type="datetime-local" value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button">保存记录</button></div></form></Modal>;
}
