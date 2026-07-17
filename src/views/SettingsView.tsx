import { Download, Plus, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { AppData, Category } from "../domain";
import { categoryColors } from "../domain";

type Props = {
  data: AppData;
  onGoalChange: (minutes: number) => void;
  onAddCategory: (category: Category) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
};

export function SettingsView({ data, onGoalChange, onAddCategory, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(categoryColors[4]);
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
        <section className="setting-card card"><div className="setting-title"><h2>每日目标</h2><p>目标应该有一点挑战，也要允许生活偶尔发生。</p></div><label className="goal-input"><input type="number" min="10" max="1440" step="10" value={data.settings.dailyGoalMinutes} onChange={(event) => onGoalChange(Number(event.target.value))}/><span>分钟 / 天</span></label></section>
        <section className="setting-card card"><div className="setting-title"><h2>学习分类</h2><p>分类会用于计时选择和统计分布。</p></div><div className="category-chips">{data.categories.map((item) => <span key={item.id}><i style={{ background: item.color }}/>{item.name}</span>)}</div><div className="add-category"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="新分类名称" maxLength={12}/><div className="color-picker">{categoryColors.map((value) => <button key={value} className={color === value ? "selected" : ""} style={{ background: value }} onClick={() => setColor(value)} aria-label={`选择颜色 ${value}`}/>)}</div><button className="secondary-button icon-button" onClick={add}><Plus size={17}/>添加</button></div></section>
        <section className="setting-card card data-setting"><div className="setting-title"><h2>数据与备份</h2><p>所有数据只保存在这台设备。建议定期导出一份 JSON 备份。</p></div><div className="setting-actions"><button className="secondary-button icon-button" onClick={onExport}><Download size={17}/>导出备份</button><button className="secondary-button icon-button" onClick={() => fileRef.current?.click()}><Upload size={17}/>导入备份</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])}/></div></section>
        <section className="setting-card card danger-zone"><div className="setting-title"><h2>清空学习数据</h2><p>清除全部学习记录与正在进行的计时。分类和每日目标设置会保留，此操作无法撤销。</p></div><button className="danger-button icon-button" onClick={onReset}><RotateCcw size={17}/>清空学习数据</button></section>
      </div>
      <footer className="app-about"><span>拾光 Study Flow · 0.1.0</span><span>本地优先 · 无账号 · 无网络</span></footer>
    </div>
  );
}
