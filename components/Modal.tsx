'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
        {children}
      </section>
    </div>
  );
}
