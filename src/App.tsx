import { BarChart3, BookOpen, Clock3, History, Minus, Settings, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ActiveTimer, AppData, Category, Page, StudySession } from "./domain";
import { storage, validateImport } from "./lib/storage";
import { isDesktopApp, sqliteRepository } from "./lib/database";
import { createAutomaticBackup, getBackupInfo, openBackupDirectory, type BackupInfo } from "./lib/backup";
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

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "未知错误"; }
}

export default function App() {
  const [data, setData] = useState<AppData>(() => storage.load());
  const initialSnapshot = useRef(data);
  const [storageMode, setStorageMode] = useState<"loading" | "sqlite" | "localStorage">(() => isDesktopApp() ? "loading" : "localStorage");
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [backupError, setBackupError] = useState("");
  const [page, setPage] = useState<Page>("today");
  const [elapsed, setElapsed] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [undoSession, setUndoSession] = useState<StudySession | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState(() => ({ categoryId: data.categories.find((category) => !category.archivedAt)?.id ?? "", task: "" }));
  const activeCategories = useMemo(() => data.categories.filter((category) => !category.archivedAt), [data.categories]);

  useEffect(() => {
    if (!isDesktopApp()) return;
    let active = true;
    sqliteRepository.initialize(initialSnapshot.current)
      .then((snapshot) => {
        if (!active) return;
        setData(snapshot);
        setStorageMode("sqlite");
        getBackupInfo().then(setBackupInfo).catch((error) => setBackupError(errorMessage(error)));
      })
      .catch((error) => {
        if (!active) return;
        setStorageMode("localStorage");
        setToast(`数据库初始化失败，已使用兼容存储：${errorMessage(error)}`);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (storageMode === "loading") return;
    if (storageMode === "sqlite") {
      sqliteRepository.save(data)
        .then(() => createAutomaticBackup(data)
          .then((info) => {
            setBackupInfo(info);
            setBackupError("");
          })
          .catch((error) => setBackupError(errorMessage(error))))
        .catch((error) => setToast(`保存失败：${errorMessage(error)}`));
      return;
    }
    storage.save(data);
  }, [data, storageMode]);
  useEffect(() => {
    setDraft((current) => activeCategories.some((category) => category.id === current.categoryId)
      ? current
      : { ...current, categoryId: activeCategories[0]?.id ?? "" });
  }, [activeCategories]);
  useEffect(() => {
    const update = () => {
      const timer = data.activeTimer;
      setElapsed(timer ? timer.accumulatedSeconds + (timer.runningSince ? Math.floor((Date.now() - new Date(timer.runningSince).getTime()) / 1000) : 0) : 0);
    };
    update();
    // 以更高频率校准真实时间，避免 1000ms 定时器漂移时跨过整秒边界。
    // 界面仍只显示整数秒，不会增加实际计时速度。
    const id = window.setInterval(update, 200);
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
    const endedAt = new Date().toISOString();
    const session: StudySession = { id: crypto.randomUUID(), categoryId: timer.categoryId, task: timer.task, startedAt: timer.startedAt, endedAt, durationSeconds: seconds, createdAt: endedAt, updatedAt: endedAt, version: 1, deviceId: data.deviceId };
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
    const updatedAt = new Date().toISOString();
    updateData((current) => ({ ...current, sessions: [{ ...undoSession, updatedAt, version: (undoSession.version ?? 1) + 1, deviceId: current.deviceId }, ...current.sessions] }));
    setUndoSession(null);
    setToast("记录已恢复");
  };
  const saveManualSession = (session: StudySession) => {
    updateData((current) => {
      const now = new Date().toISOString();
      return { ...current, sessions: [{ ...session, createdAt: now, updatedAt: now, version: 1, deviceId: current.deviceId }, ...current.sessions] };
    });
    setManualOpen(false);
    setToast("补记成功");
  };
  const saveEditedSession = (session: StudySession) => {
    updateData((current) => {
      const updatedAt = new Date().toISOString();
      return {
        ...current,
        sessions: current.sessions.map((item) => item.id === session.id
          ? { ...session, createdAt: item.createdAt ?? item.startedAt, updatedAt, version: (item.version ?? 1) + 1, deviceId: current.deviceId }
          : item),
      };
    });
    setEditingSession(null);
    setToast("记录已更新");
  };
  const resetStudyData = () => {
    setData((current) => ({ ...current, sessions: [], activeTimer: null }));
    setResetOpen(false);
    setToast("学习数据已清空");
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
      const imported = validateImport(JSON.parse(await file.text()), data.deviceId);
      setData(imported);
      setToast("备份已恢复");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "导入失败");
    }
  };
  const backupNow = async () => {
    try {
      const info = await createAutomaticBackup(data);
      setBackupInfo(info);
      setBackupError("");
      setToast("自动备份已更新");
    } catch (error) {
      const message = errorMessage(error);
      setBackupError(message);
      setToast(`备份失败：${message}`);
    }
  };
  const showBackupDirectory = async () => {
    try {
      await openBackupDirectory();
    } catch (error) {
      setToast(`无法打开备份目录：${errorMessage(error)}`);
    }
  };
  const updateCategory = (categoryId: string, name: string, color: string) => {
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      categories: current.categories.map((category) => category.id === categoryId
        ? { ...category, name, color, updatedAt: now, version: (category.version ?? 1) + 1, deviceId: current.deviceId }
        : category),
    }));
    setToast("分类已更新");
  };
  const setCategoryArchived = (categoryId: string, archived: boolean) => {
    if (archived && data.activeTimer?.categoryId === categoryId) {
      setToast("请先结束当前计时，再归档这个分类");
      return;
    }
    if (archived && activeCategories.length <= 1) {
      setToast("至少保留一个可用分类");
      return;
    }
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      categories: current.categories.map((category) => category.id === categoryId
        ? { ...category, archivedAt: archived ? now : null, updatedAt: now, version: (category.version ?? 1) + 1, deviceId: current.deviceId }
        : category),
    }));
    setToast(archived ? "分类已归档，历史记录仍会保留" : "分类已恢复");
  };
  const mergeCategory = (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !data.categories.some((category) => category.id === targetId && !category.archivedAt)) return;
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      activeTimer: current.activeTimer?.categoryId === sourceId ? { ...current.activeTimer, categoryId: targetId } : current.activeTimer,
      sessions: current.sessions.map((session) => session.categoryId === sourceId
        ? { ...session, categoryId: targetId, updatedAt: now, version: (session.version ?? 1) + 1, deviceId: current.deviceId }
        : session),
      categories: current.categories.map((category) => category.id === sourceId
        ? { ...category, archivedAt: now, updatedAt: now, version: (category.version ?? 1) + 1, deviceId: current.deviceId }
        : category),
    }));
    setToast("分类已合并，记录与时长均已保留");
  };

  const content = useMemo(() => {
    if (page === "analytics") return <AnalyticsView data={data}/>;
    if (page === "history") return <HistoryView data={data} onDelete={deleteSession} onEdit={setEditingSession} onOpenManual={() => setManualOpen(true)}/>;
    if (page === "settings") return <SettingsView data={data} storageMode={storageMode} backupInfo={backupInfo} backupError={backupError} onGoalChange={(minutes) => updateData((current) => ({ ...current, settings: { ...current.settings, dailyGoalMinutes: Math.min(1440, Math.max(1, minutes || 1)), updatedAt: new Date().toISOString(), version: (current.settings.version ?? 1) + 1, deviceId: current.deviceId } }))} onAddCategory={(category) => updateData((current) => { const now = new Date().toISOString(); return { ...current, categories: [...current.categories, { ...category, archivedAt: null, createdAt: now, updatedAt: now, version: 1, deviceId: current.deviceId }] }; })} onUpdateCategory={updateCategory} onSetCategoryArchived={setCategoryArchived} onMergeCategory={mergeCategory} onExport={exportData} onImport={importData} onBackupNow={backupNow} onOpenBackupDirectory={showBackupDirectory} onReset={() => setResetOpen(true)}/>;
    return <TodayView data={data} elapsed={elapsed} draft={draft} timer={data.activeTimer} onDraftChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))} onStart={startTimer} onToggle={toggleTimer} onFinish={finishTimer} onDelete={deleteSession} onEdit={setEditingSession} onOpenManual={() => setManualOpen(true)} onShowAll={() => setPage("history")}/>;
  }, [page, data, elapsed, draft, storageMode, backupInfo, backupError]);

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
      {manualOpen && <ManualSessionModal categories={activeCategories} onClose={() => setManualOpen(false)} onSave={saveManualSession}/>}
      {editingSession && <EditSessionModal session={editingSession} categories={data.categories.filter((category) => !category.archivedAt || category.id === editingSession.categoryId)} onClose={() => setEditingSession(null)} onSave={saveEditedSession}/>}
      {resetOpen && <ConfirmModal title="清空学习数据？" description="全部学习记录与正在进行中的计时将被清除。分类和每日目标设置会保留，此操作无法撤销。" confirmLabel="确认清空" onClose={() => setResetOpen(false)} onConfirm={resetStudyData}/>}
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

function toLocalDateTime(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function EditSessionModal({ session, categories, onClose, onSave }: { session: StudySession; categories: Category[]; onClose: () => void; onSave: (session: StudySession) => void }) {
  const [form, setForm] = useState({
    task: session.task,
    categoryId: session.categoryId,
    endedAt: toLocalDateTime(session.endedAt),
    minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const end = new Date(form.endedAt);
    const minutes = Math.min(1440, Math.max(1, Number(form.minutes) || 1));
    const seconds = minutes * 60;
    onSave({
      ...session,
      task: form.task.trim() || "未命名学习",
      categoryId: form.categoryId,
      endedAt: end.toISOString(),
      startedAt: new Date(end.getTime() - seconds * 1000).toISOString(),
      durationSeconds: seconds,
    });
  };
  return <Modal title="编辑学习记录" onClose={onClose}><form className="modal-form" onSubmit={submit}><label><span>项目名称</span><input autoFocus required value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} placeholder="完成了什么？" maxLength={60}/></label><div className="form-row"><label><span>分类</span><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>时长（分钟）</span><input required type="number" min="1" max="1440" step="1" value={form.minutes} onChange={(event) => setForm({ ...form, minutes: Number(event.target.value) })}/></label></div><label><span>结束时间</span><input required type="datetime-local" value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-button">保存修改</button></div></form></Modal>;
}
