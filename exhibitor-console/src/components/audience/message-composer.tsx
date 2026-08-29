"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { sendMessage } from "@/lib/api";

/** Inline message composer to reply to a viewer who chose the booth. */
export function MessageComposer({ toUserId, onSent }: { toUserId: string; onSent?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await sendMessage(toUserId, body.trim());
      toast.success(t("appt.sent"));
      setBody("");
      setOpen(false);
      onSent?.();
    } catch {
      toast.error(t("booth.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        data-el="open-composer"
        onClick={() => setOpen(true)}
        className="rounded-full border border-primary/25 bg-background px-3 py-1.5 text-[11px] font-bold text-primary active:scale-95"
      >
        {t("appt.message")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={t("appt.messagePlaceholder")}
        className="min-w-0 flex-1 rounded-full border border-primary/30 bg-background px-3 py-1.5 text-[12px] outline-none"
      />
      <button
        data-el="send-message"
        onClick={send}
        disabled={busy}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
