'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
    element.tabIndex >= 0
    && element.getAttribute('aria-hidden') !== 'true'
    && (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0)
  ));
}

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
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusFrame = requestAnimationFrame(() => {
      const preferredFocus = dialog.querySelector<HTMLElement>('[data-modal-initial-focus], [autofocus]');
      (preferredFocus ?? getFocusableElements(dialog)[0] ?? dialog).focus({ preventScroll: true });
    });

    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', listener);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', listener);
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className={`modal-card ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button></header>
        {children}
      </section>
    </div>
  );
}
