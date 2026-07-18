import { Download, FolderOpen, Plus, RotateCcw, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppData, Category } from "../domain";
import { categoryColors } from "../domain";
import type { BackupInfo } from "../lib/backup";

type Props = {
  data: AppData;
  storageMode: "loading" | "sqlite" | "localStorage";
  backupInfo: BackupInfo | null;
  backupError: string;
  onGoalChange: (minutes: number) => void;
  onAddCategory: (category: Category) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBackupNow: () => void;
  onOpenBackupDirectory: () => void;
  onReset: () => void;
};

export function SettingsView({ data, storageMode, backupInfo, backupError, onGoalChange, onAddCategory, onExport, onImport, onBackupNow, onOpenBackupDirectory, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(categoryColors[4]);
  const [goalHours, setGoalHours] = useState(String(Math.floor(data.settings.dailyGoalMinutes / 60)));
  const [goalMinutes, setGoalMinutes] = useState(String(data.settings.dailyGoalMinutes % 60));

  useEffect(() => {
    setGoalHours(String(Math.floor(data.settings.dailyGoalMinutes / 60)));
    setGoalMinutes(String(data.settings.dailyGoalMinutes % 60));
  }, [data.settings.dailyGoalMinutes]);

  const commitGoal = () => {
    const hours = Math.min(24, Math.max(0, Number.parseInt(goalHours, 10) || 0));
    const minutes = Math.min(59, Math.max(0, Number.parseInt(goalMinutes, 10) || 0));
    const total = Math.min(1440, Math.max(1, hours * 60 + minutes));
    onGoalChange(total);
    setGoalHours(String(Math.floor(total / 60)));
    setGoalMinutes(String(total % 60));
  };

  const commitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitGoal();
      event.currentTarget.blur();
    }
  };
  const add = () => {
    if (!name.trim()) return;
    onAddCategory({ id: crypto.randomUUID(), name: name.trim(), color });
    setName("");
    setColor(categoryColors[(data.categories.length + 1) % categoryColors.length]);
  };
  return (
    <div className="page-content settings-page">
      <header className="page-heading"><div><span className="date-line">让拾光适合你的节奏</span><h1>设置</h1></div></header>
      <div className="settings-grid">
        <section className="setting-card card"><div className="setting-title"><h2>每日目标</h2><p>可以自由设置小时和分钟，精确到 1 分钟。</p></div><div className="goal-editor"><label><input aria-label="目标小时" type="number" min="0" max="24" step="1" value={goalHours} onChange={(event) => setGoalHours(event.target.value)} onBlur={commitGoal} onKeyDown={commitOnEnter}/><span>小时</span></label><i>:</i><label><input aria-label="目标分钟" type="number" min="0" max="59" step="1" value={goalMinutes} onChange={(event) => setGoalMinutes(event.target.value)} onBlur={commitGoal} onKeyDown={commitOnEnter}/><span>分钟 / 天</span></label></div></section>
        <section className="setting-card card"><div className="setting-title"><h2>学习分类</h2><p>分类会用于计时选择和统计分布。</p></div><div className="category-chips">{data.categories.map((item) => <span key={item.id}><i style={{ background: item.color }}/>{item.name}</span>)}</div><div className="add-category"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="新分类名称" maxLength={12}/><div className="color-picker">{categoryColors.map((value) => <button key={value} className={color === value ? "selected" : ""} style={{ background: value }} onClick={() => setColor(value)} aria-label={`选择颜色 ${value}`}/>)}</div><button className="secondary-button icon-button" onClick={add}><Plus size={17}/>添加</button></div></section>
        <section className="setting-card card data-setting">
          <div className="setting-title"><h2>数据与备份</h2><p>{storageMode === "sqlite" ? "每次保存后自动更新当天备份，并保留最近 14 天。" : storageMode === "loading" ? "正在准备本地数据库…" : "浏览器预览不生成自动备份，安装版会使用本地 SQLite 和备份目录。"}</p></div>
          <div className="backup-panel">
            {storageMode === "sqlite" && <div className="backup-status"><span>自动备份 · {backupInfo?.backupCount ?? 0} 份</span><code title={backupInfo?.directory}>{backupInfo?.directory ?? "正在读取备份目录…"}</code><small>{backupError ? `上次备份失败：${backupError}` : backupInfo?.latestFile ? `最新：${backupInfo.latestFile}` : "尚未生成备份"}</small></div>}
            <div className="setting-actions"><button className="secondary-button icon-button" onClick={onBackupNow} disabled={storageMode !== "sqlite"}><Save size={17}/>立即备份</button><button className="secondary-button icon-button" onClick={onOpenBackupDirectory} disabled={storageMode !== "sqlite"}><FolderOpen size={17}/>打开目录</button><button className="secondary-button icon-button" onClick={onExport}><Download size={17}/>另存备份</button><button className="secondary-button icon-button" onClick={() => fileRef.current?.click()}><Upload size={17}/>导入备份</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])}/></div>
          </div>
        </section>
        <section className="setting-card card danger-zone"><div className="setting-title"><h2>清空学习数据</h2><p>清除全部学习记录与正在进行的计时。分类和每日目标设置会保留，此操作无法撤销。</p></div><button className="danger-button icon-button" onClick={onReset}><RotateCcw size={17}/>清空学习数据</button></section>
      </div>
      <footer className="app-about"><span>拾光 Study Flow · 0.3.4</span><span>本地优先 · SQLite · 同步就绪</span></footer>
    </div>
  );
}
