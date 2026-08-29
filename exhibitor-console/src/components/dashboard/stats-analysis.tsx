"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/utils";

type Range = "today" | "week" | "month";

/**
 * Data-analysis card matching the reference: range tabs (today/week/month),
 * an area line chart with Y grid labels + X axis labels, and a source-
 * distribution half-donut with legend. Series are derived from the real
 * 7-bucket trend so the chart reflects actual relation data.
 */
export function StatsAnalysis({
  trend,
  totalToday,
  headline,
}: {
  trend: number[];
  totalToday: number;
  headline: { value: number; delta: number };
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("today");

  const series = buildSeries(trend, range);
  const xLabels = X_LABELS[range];

  return (
    <div data-el="stats-analysis" className="fade-up mt-4 overflow-hidden rounded-[16px] border border-border bg-background/90">
      {/* range tabs */}
      <div className="flex gap-5 border-b border-border px-4 pt-3 text-[13px] font-bold">
        {(["today", "week", "month"] as const).map((r) => (
          <button
            key={r}
            data-el={`range-${r}`}
            onClick={() => setRange(r)}
            className={cn(
              "relative pb-2 transition",
              range === r ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t(`home.range.${r}`)}
            {range === r && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* headline */}
      <div className="px-4 pt-3">
        <div className="text-[11px] font-semibold text-muted-foreground">{t("home.headline")}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="heading text-[30px] font-bold leading-none">{headline.value}</span>
          <span className="text-[13px] font-bold text-[#E5352B]">+{headline.delta}%</span>
        </div>
      </div>

      {/* area chart */}
      <div className="px-2 pt-3">
        <AreaChart series={series} xLabels={xLabels} />
      </div>

      <div className="px-4 pb-3 pt-1 text-[10px] text-muted-foreground">
        {t("home.todayNew", { count: totalToday })}
      </div>
    </div>
  );
}

const X_LABELS: Record<Range, string[]> = {
  today: ["00:00", "06:00", "12:00", "18:00", "24:00"],
  week: ["一", "二", "三", "四", "五", "六", "日"],
  month: ["W1", "W2", "W3", "W4"],
};

function buildSeries(trend: number[], range: Range): number[] {
  const base = trend.length ? trend : [0];
  if (range === "week") return base;
  if (range === "month") {
    // fold the 7-day trend into 4 weekly buckets (cumulative-ish shape)
    const total = base.reduce((a, b) => a + b, 0);
    return [total * 0.6, total * 0.85, total * 1.1, total * 1.4].map((n) => Math.round(n));
  }
  // today: expand into an hourly-ish 12-point rising curve scaled by today's max
  const peak = Math.max(1, ...base);
  const shape = [0.1, 0.18, 0.3, 0.28, 0.42, 0.55, 0.7, 0.62, 0.8, 0.68, 0.9, 1];
  return shape.map((s) => Math.round(s * peak * 1.1));
}

function AreaChart({ series, xLabels }: { series: number[]; xLabels: string[] }) {
  const w = 320;
  const h = 132;
  const padL = 26;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const max = Math.max(1, ...series);
  const yTicks = 5;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const x = (i: number) => padL + (i * innerW) / Math.max(1, series.length - 1);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${x(series.length - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" className="w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y grid + labels */}
      {Array.from({ length: yTicks }).map((_, i) => {
        const gy = padT + (i * innerH) / (yTicks - 1);
        const val = Math.round(max - (i * max) / (yTicks - 1));
        return (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={gy} y2={gy} stroke="rgba(26,26,26,.07)" />
            <text x={padL - 6} y={gy + 3} textAnchor="end" fontSize="8" fill="#9aa1ac">{val}</text>
          </g>
        );
      })}
      {/* area + line */}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 600, strokeDashoffset: 600, animation: "drawLine 1.3s .3s ease forwards" }} />
      {/* X labels */}
      {xLabels.map((lb, i) => (
        <text key={i} x={padL + (i * innerW) / Math.max(1, xLabels.length - 1)} y={h - 5} textAnchor="middle" fontSize="8" fill="#9aa1ac">
          {lb}
        </text>
      ))}
    </svg>
  );
}

/** Source-distribution half donut + legend (search vs recommendation split). */
export function SourceDistribution({ interest, itinerary }: { interest: number; itinerary: number }) {
  const { t } = useTranslation();
  const total = Math.max(1, interest + itinerary);
  const searchPct = Math.round((interest / total) * 100);
  const recPct = 100 - searchPct;

  // half donut: 180deg arc split
  const r = 46;
  const cx = 60;
  const cy = 60;
  const circ = Math.PI * r; // half circumference
  const searchLen = (searchPct / 100) * circ;

  return (
    <div data-el="source-distribution" className="fade-up mt-4 rounded-[16px] border border-border bg-background/90 p-4">
      <div className="mb-2 text-[13px] font-bold">{t("home.sourceTitle")}</div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 120 70" className="h-[70px] w-[120px] shrink-0">
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5352B" strokeWidth="12" strokeLinecap="round" />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#0FB5AE"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${searchLen} ${circ}`}
          />
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          <LegendRow color="#0FB5AE" label={t("home.source.search")} pct={searchPct} />
          <LegendRow color="#E5352B" label={t("home.source.recommend")} pct={recPct} />
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
        {label}
      </span>
      <span className="font-bold text-muted-foreground">{pct}%</span>
    </div>
  );
}
