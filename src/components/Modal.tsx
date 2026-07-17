import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="ghost-icon" onClick={onClose} aria-label="关闭"><X size={20}/></button></header>
        {children}
      </section>
    </div>
  );
}
