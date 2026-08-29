"use client";

import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Video, Pencil, Check, Loader2 } from "lucide-react";
import { storage } from "@eazo/sdk";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/utils/utils";

/** Section wrapper with preview + editable badge. */
export function BoothSection({ title, children, el }: { title: string; children: ReactNode; el?: string }) {
  const { t } = useTranslation();
  return (
    <section data-el={el} className="fade-up mt-4 rounded-[15px] border border-border bg-background/90 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <strong className="heading text-[13px] font-bold">{title}</strong>
        <span className="rounded-full border border-primary/20 bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
          {t("booth.editBadge")}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Real media upload → S3 via presigned URL, returns a permanent CDN url. */
export function MediaUpload({
  kind,
  label,
  currentUrl,
  boothId,
  onUploaded,
  className,
}: {
  kind: "video" | "cover";
  label: string;
  currentUrl: string | null | undefined;
  boothId: string;
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = kind === "video" ? Video : ImagePlus;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await storage.upload(`booths/${boothId}/${kind}-${Date.now()}-${file.name}`, file);
      onUploaded(url);
      toast.success(t("booth.saved"));
    } catch {
      toast.error(t("booth.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      data-el={`upload-${kind}`}
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[12px] border-2 border-dashed border-primary/30 bg-secondary/40 text-primary transition active:scale-[0.99]",
        className,
      )}
    >
      {kind === "cover" && currentUrl && !busy ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="relative z-10 grid h-9 w-9 place-items-center rounded-full bg-primary/10">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : currentUrl ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className="relative z-10 px-2 text-center text-[11px] font-semibold leading-tight">
        {busy ? t("booth.uploading") : currentUrl ? t("booth.reupload") : label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}

/** Inline editable text row (single-line or multiline). */
export function EditField({
  label,
  value,
  onChange,
  multiline,
  hint,
  inputType = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
  inputType?: "text" | "number";
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    return (
      <div className="rounded-[10px] border border-primary/40 bg-background px-3 py-2">
        <div className="mb-1 text-[10px] font-semibold text-muted-foreground">{label}</div>
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            rows={3}
            className="w-full resize-none bg-transparent text-[13px] outline-none"
          />
        ) : (
          <input
            autoFocus
            type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-full bg-transparent text-[13px] outline-none"
          />
        )}
      </div>
    );
  }

  return (
    <button
      data-el="edit-field"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 text-left active:bg-primary/5"
    >
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-0.5 text-[13px]",
            value ? "text-foreground" : "text-muted-foreground/60",
            multiline ? "line-clamp-2" : "truncate",
          )}
        >
          {value || hint || t("booth.emptyHint")}
        </div>
      </div>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
    </button>
  );
}
