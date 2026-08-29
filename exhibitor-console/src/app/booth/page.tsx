"use client";

import { useEffect, useState } from "react";
import { Plus, X, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { AuthGate } from "@/components/shell/auth-gate";
import { BoothSection, MediaUpload, EditField } from "@/components/booth/booth-editors";
import { fetchMyBooth, saveMyBooth, type Booth, type BoothPatch } from "@/lib/api";
import { BOOTH_CATEGORY_KEYS } from "@/lib/exhibitor/constants";
import { cn } from "@/utils/utils";

function BoothEditor() {
  const { t } = useTranslation();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    fetchMyBooth().then(setBooth).catch(() => toast.error(t("booth.saveFailed")));
  }, [t]);

  function patch(p: BoothPatch) {
    setBooth((b) => (b ? { ...b, ...p } : b));
  }

  async function save() {
    if (!booth) return;
    setSaving(true);
    try {
      const saved = await saveMyBooth({
        name: booth.name,
        category: booth.category,
        intro: booth.intro,
        keywords: booth.keywords,
        recommendMinutes: booth.recommendMinutes,
        imageUrl: booth.imageUrl,
        videoUrl: booth.videoUrl,
        ownerName: booth.ownerName,
        ownerRole: booth.ownerRole,
        ownerOrg: booth.ownerOrg,
        ownerContact: booth.ownerContact,
        zone: booth.zone,
      });
      setBooth(saved);
      toast.success(t("booth.saved"));
    } catch {
      toast.error(t("booth.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!booth) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tags = booth.keywords ?? [];

  return (
    <>
      <div className="fade-up rounded-[12px] border border-primary/20 bg-secondary px-3 py-2 text-[11px] leading-snug text-[color:var(--ink-2)]">
        {t("booth.syncNote")}
      </div>

      <BoothSection title={t("booth.sections.media")} el="booth-media">
        <div className="grid grid-cols-2 gap-2.5">
          <MediaUpload kind="video" label={t("booth.placeholder.video")} currentUrl={booth.videoUrl} boothId={booth.id} onUploaded={(url) => patch({ videoUrl: url })} className="h-28" />
          <MediaUpload kind="cover" label={t("booth.placeholder.cover")} currentUrl={booth.imageUrl} boothId={booth.id} onUploaded={(url) => patch({ imageUrl: url })} className="h-28" />
        </div>
      </BoothSection>

      <BoothSection title={t("booth.sections.basic")} el="booth-basic">
        <div className="grid gap-2">
          <EditField label={t("booth.sections.name")} value={booth.name} onChange={(v) => patch({ name: v })} />
          <div>
            <div className="mb-1.5 px-1 text-[10px] font-semibold text-muted-foreground">{t("booth.sections.category")}</div>
            <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
              {BOOTH_CATEGORY_KEYS.map((c) => (
                <button
                  key={c}
                  onClick={() => patch({ category: c })}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold active:scale-95",
                    booth.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-[color:var(--ink-2)]",
                  )}
                >
                  {t(`booth.category.${c}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <EditField label={t("booth.sections.area")} value={booth.zone ?? ""} onChange={(v) => patch({ zone: v })} />
            <EditField label={t("booth.sections.duration")} value={String(booth.recommendMinutes)} onChange={(v) => patch({ recommendMinutes: Number(v) || 0 })} inputType="number" />
          </div>
        </div>
      </BoothSection>

      <BoothSection title={t("booth.sections.tags")} el="booth-tags">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full border border-border bg-background py-1.5 pl-3 pr-2 text-[11px] font-bold text-[color:var(--ink-2)]">
              #{tag}
              <button onClick={() => patch({ keywords: tags.filter((x) => x !== tag) })} className="text-muted-foreground active:scale-90">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1 rounded-full border-2 border-dashed border-primary/30 py-1 pl-3 pr-1">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagDraft.trim()) {
                  patch({ keywords: [...tags, tagDraft.trim()].slice(0, 12) });
                  setTagDraft("");
                }
              }}
              placeholder={t("common.edit")}
              className="w-16 bg-transparent text-[11px] font-bold text-primary outline-none placeholder:text-primary/50"
            />
            <button
              onClick={() => {
                if (tagDraft.trim()) {
                  patch({ keywords: [...tags, tagDraft.trim()].slice(0, 12) });
                  setTagDraft("");
                }
              }}
              className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary active:scale-90"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </BoothSection>

      <BoothSection title={t("booth.sections.intro")} el="booth-intro">
        <EditField label={t("booth.sections.intro")} value={booth.intro} onChange={(v) => patch({ intro: v })} multiline />
      </BoothSection>

      <BoothSection title={t("booth.sections.manager")} el="booth-manager">
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <EditField label={t("booth.sections.ownerName")} value={booth.ownerName ?? ""} onChange={(v) => patch({ ownerName: v })} />
            <EditField label={t("booth.sections.ownerRole")} value={booth.ownerRole ?? ""} onChange={(v) => patch({ ownerRole: v })} />
          </div>
          <EditField label={t("booth.sections.ownerOrg")} value={booth.ownerOrg ?? ""} onChange={(v) => patch({ ownerOrg: v })} />
          <EditField label={t("booth.sections.ownerContact")} value={booth.ownerContact ?? ""} onChange={(v) => patch({ ownerContact: v })} />
        </div>
      </BoothSection>

      <button
        data-el="booth-save"
        onClick={save}
        disabled={saving}
        className="fade-up mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(27,79,216,0.24)] active:scale-95 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? t("booth.saving") : t("booth.save")}
      </button>
    </>
  );
}

export default function BoothPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <PageHeader
        kicker={t("booth.kicker")}
        title={t("booth.title")}
        subtitle={t("booth.subtitle")}
      />
      <AuthGate>
        <BoothEditor />
      </AuthGate>
    </AppShell>
  );
}
