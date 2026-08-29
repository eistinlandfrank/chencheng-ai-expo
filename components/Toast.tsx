'use client';

import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type ToastState = { type: 'success' | 'info' | 'warning'; message: string } | null;

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'warning' ? TriangleAlert : Info;
  return (
    <div className={`toast toast-${toast.type}`} role="status">
      <Icon size={19} aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示"><X size={16} /></button>
    </div>
  );
}
