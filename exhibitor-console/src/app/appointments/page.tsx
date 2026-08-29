"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { AuthGate } from "@/components/shell/auth-gate";
import { FilterChips } from "@/components/shell/filter-chips";
import { MessageComposer } from "@/components/audience/message-composer";
import { fetchAudience, type AudienceItem } from "@/lib/api";
import { cn } from "@/utils/utils";

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AUDIENCE_FILTERS = ["all", "interest", "itinerary", "reserve"] as const;

/** Top-right jump switch between the two stacked sections. */
function SectionSwitch({ active, onJump }: { active: "reserve" | "audience"; onJump: (k: "reserve" | "audience") => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex rounded-full border border-border bg-background p-0.5 text-[11px] font-bold shadow-sm">
      {(["reserve", "audience"] as const).map((k) => (
        <button
          key={k}
          data-el={`switch-${k}`}
          onClick={() => onJump(k)}
          className={cn(
            "rounded-full px-2.5 py-1 transition",
            active === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {k === "reserve" ? t("appt.tabShort") : t("leads.tabShort")}
        </button>
      ))}
    </div>
  );
}

/** Top: reservations (with messaging). Bottom: full audience list by kind. */
function CombinedAudience() {
  const { t, i18n } = useTranslation();
  const [reserves, setReserves] = useState<AudienceItem[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [audience, setAudience] = useState<AudienceItem[] | null>(null);

  useEffect(() => {
    fetchAudience("reserve").then(setReserves).catch(() => setReserves([]));
  }, []);

  useEffect(() => {
    setAudience(null);
    fetchAudience(filter === "all" ? undefined : filter)
      .then(setAudience)
      .catch(() => setAudience([]));
  }, [filter]);

  return (
    <>
      {/* ── 预约 ── */}
      <section data-el="reserve-section">
        <div className="fade-up mb-1 flex items-center justify-between px-0.5">
          <strong className="heading text-sm font-bold">{t("appt.title")}</strong>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {t("appt.count", { count: reserves?.length ?? 0 })}
          </span>
        </div>
        {reserves === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="fade-up border-t border-border">
            {reserves.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("appt.empty")}</p>
            )}
            {reserves.map((a) => (
              <div key={a.relationId} data-el="reserve-row" className="border-b border-border py-3.5">
                <div className="grid grid-cols-[38px_1fr] items-center gap-3">
                  <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
                    {(a.name ?? t("leads.anonymous"))[0]}
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-sm leading-tight">{a.name ?? t("leads.anonymous")}</b>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {t("appt.party", { time: formatTime(a.createdAt, i18n.language) })}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pl-[50px]">
                  <MessageComposer toUserId={a.userId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 全部名单 ── */}
      <section data-el="audience-section" className="mt-7 scroll-mt-4">
        <div className="fade-up mb-1 px-0.5">
          <strong className="heading text-sm font-bold">{t("leads.title")}</strong>
        </div>
        <FilterChips
          el="leads-filters"
          items={AUDIENCE_FILTERS.map((f) => ({ key: f, label: t(`leads.filter.${f}`) }))}
          active={filter}
          onSelect={setFilter}
        />
        {audience === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="fade-up border-t border-border">
            {audience.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("leads.empty")}</p>
            )}
            {audience.map((a) => (
              <div key={a.relationId} data-el="lead-row" className="border-b border-border py-3.5">
                <div className="grid grid-cols-[38px_1fr_auto] items-center gap-3">
                  <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
                    {(a.name ?? t("leads.anonymous"))[0]}
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-sm leading-tight">{a.name ?? t("leads.anonymous")}</b>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {t(`leads.kind.${a.kind}`)}
                    </span>
                  </div>
                  <span className="justify-self-end whitespace-nowrap rounded-full border border-primary/20 bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">
                    {t(`leads.kind.${a.kind}`)}
                  </span>
                </div>
                <div className="mt-2 pl-[50px]">
                  <MessageComposer toUserId={a.userId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function AudiencePage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<"reserve" | "audience">("reserve");

  function jump(target: "reserve" | "audience") {
    setActive(target);
    document.querySelector(`[data-el="${target}-section"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell>
      <PageHeader
        kicker={t("appt.kicker")}
        title={t("nav.audience")}
        subtitle={t("appt.subtitle")}
        action={<SectionSwitch active={active} onJump={jump} />}
      />
      <AuthGate>
        <CombinedAudience />
      </AuthGate>
    </AppShell>
  );
}
