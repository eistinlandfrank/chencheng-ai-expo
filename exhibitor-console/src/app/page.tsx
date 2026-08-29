"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Users, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { AuthGate } from "@/components/shell/auth-gate";
import { StatsAnalysis, SourceDistribution } from "@/components/dashboard/stats-analysis";
import { fetchStats, type BoothStats } from "@/lib/api";
import { cn } from "@/utils/utils";

const METRIC_KEYS = ["interest", "itinerary", "reserve", "checkin"] as const;
const METRIC_TARGET: Record<(typeof METRIC_KEYS)[number], string> = {
  interest: "/appointments",
  itinerary: "/appointments",
  reserve: "/appointments",
  checkin: "/appointments",
};

function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [stats, setStats] = useState<BoothStats | null>(null);

  useEffect(() => {
    fetchStats().then((r) => setStats(r.stats)).catch(() => undefined);
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div data-el="metric-strip" className="fade-up grid grid-cols-4 overflow-hidden rounded-[14px] border border-border bg-background/90 backdrop-blur">
        {METRIC_KEYS.map((k, i) => (
          <button
            key={k}
            data-el={`metric-${k}`}
            onClick={() => router.push(METRIC_TARGET[k])}
            className={cn("relative min-w-0 px-2 py-3 text-left active:scale-[0.98]", i < 3 && "border-r border-border")}
          >
            {i === 0 && <span className="absolute inset-x-2 top-0 h-[3px] rounded-b-full bg-primary" />}
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{t(`home.metric.${k}`)}</div>
            <div className="heading mt-1.5 text-[22px] font-bold leading-none">{stats[k]}</div>
          </button>
        ))}
      </div>

      <div className="fade-up mt-3 rounded-[12px] border border-border bg-secondary px-3 py-2 text-[11px] font-bold text-[color:var(--ink-2)]">
        {t("home.todayNew", { count: stats.todayNew })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button data-el="quick-edit" onClick={() => router.push("/booth")} className="fade-up flex items-center justify-center gap-1.5 rounded-[12px] border border-border bg-background py-3 text-[13px] font-bold text-primary active:scale-95">
          <Pencil className="h-4 w-4" /> {t("home.quickEdit")}
        </button>
        <button data-el="quick-audience" onClick={() => router.push("/appointments")} className="fade-up flex items-center justify-center gap-1.5 rounded-[12px] bg-primary py-3 text-[13px] font-bold text-primary-foreground active:scale-95">
          <Users className="h-4 w-4" /> {t("home.quickAudience")}
        </button>
      </div>

      <StatsAnalysis
        trend={stats.trend}
        totalToday={stats.todayNew}
        headline={{ value: stats.interest + stats.itinerary + stats.reserve + stats.checkin, delta: 12 }}
      />
      <SourceDistribution interest={stats.interest + stats.checkin} itinerary={stats.itinerary + stats.reserve} />
    </>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <PageHeader
        kicker={t("home.kicker")}
        title={t("app.boothName")}
        subtitle={t("home.subtitle")}
      />
      <AuthGate>
        <Dashboard />
      </AuthGate>
    </AppShell>
  );
}
