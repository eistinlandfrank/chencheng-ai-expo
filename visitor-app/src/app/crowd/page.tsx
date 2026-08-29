"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp, TrendingDown, Minus, Users, Route } from "lucide-react";
import { PageShell } from "@/components/shell/page-shell";
import { CATEGORY_LABEL } from "@/lib/expo/booths";
import { ACTIVE_BOOTHS as BOOTHS, getActiveBooth as getBooth } from "@/lib/expo/DATA_SOURCE";
import { baseHeat } from "@/lib/expo/quiz";
import { computeRoute, estimateMeters } from "@/lib/expo/map-graph";
import { useExpoStore } from "@/stores/expo-store";

interface Heat {
  id: string;
  people: number;
  density: number;
  trend: "up" | "down" | "flat";
}

function buildHeat(tick: number): Record<string, Heat> {
  const out: Record<string, Heat> = {};
  BOOTHS.forEach((b) => {
    const jitter = Math.round(8 * Math.sin(tick / 3 + parseInt(b.id, 10)));
    const density = Math.max(5, Math.min(99, baseHeat(b.id) + jitter));
    out[b.id] = {
      id: b.id,
      people: Math.round(density * 1.6),
      density,
      trend: jitter > 2 ? "up" : jitter < -2 ? "down" : "flat",
    };
  });
  return out;
}

function densityColor(d: number): string {
  if (d >= 75) return "#E5484D";
  if (d >= 50) return "#F0821E";
  if (d >= 30) return "#4c8f00";
  return "#74bd00";
}
function densityLabel(d: number): string {
  if (d >= 75) return "火爆";
  if (d >= 50) return "较热";
  if (d >= 30) return "适中";
  return "空闲";
}

export default function CrowdPage() {
  const { interests, currentBoothId } = useExpoStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const heat = useMemo(() => buildHeat(tick), [tick]);

  const hotRanking = useMemo(
    () => [...BOOTHS].sort((a, b) => heat[b.id].density - heat[a.id].density).slice(0, 5),
    [heat],
  );

  const mine = useMemo(
    () => interests.map((id) => getBooth(id)).filter(Boolean),
    [interests],
  );

  // combined visit order: prefer near + low crowd. score = distance*0.5 + density*0.5
  const visitOrder = useMemo(() => {
    return [...mine]
      .map((b) => {
        const dist = estimateMeters(computeRoute(currentBoothId, b!.id));
        const d = heat[b!.id].density;
        return { booth: b!, dist, density: d, score: dist * 0.4 + d * 3 };
      })
      .sort((a, b) => a.score - b.score);
  }, [mine, heat, currentBoothId]);

  return (
    <PageShell title="人流热力 · 排队专区" subtitle="实时更新 · 每 3 秒刷新">
      <div className="space-y-4 px-4 pt-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 lg:px-8 lg:py-6">
        {/* Section A: global hot */}
        <section data-el="crowd-hot" className="lg:row-span-2">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold lg:mb-3 lg:text-base">
            <Flame className="size-4 text-[#E5484D]" /> 实时热门 · 全场最火
          </div>
          <div className="space-y-2">
            {hotRanking.map((b, i) => {
              const h = heat[b.id];
              return (
                <Link
                  key={b.id}
                  href={`/booths/${b.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[.99] lg:p-4"
                >
                  <span className={`w-5 text-center text-sm font-black ${i < 3 ? "text-[#E5484D]" : "text-muted-foreground"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.id} {b.name}</div>
                    <div className="text-xs text-muted-foreground">{CATEGORY_LABEL[b.category]} · {b.zone}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm font-bold" style={{ color: densityColor(h.density) }}>
                      <Users className="size-3.5" />{h.people}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 text-[11px] text-muted-foreground">
                      {h.trend === "up" ? <TrendingUp className="size-3 text-[#E5484D]" /> : h.trend === "down" ? <TrendingDown className="size-3 text-emerald-600" /> : <Minus className="size-3" />}
                      {densityLabel(h.density)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section B: my booths */}
        <section data-el="crowd-mine">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold lg:mb-3 lg:text-base">
            <Users className="size-4 text-accent-foreground" /> 我关注的展位 · 人流浓度
          </div>
          {mine.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              还没有关注的展位，去「展位库」收藏几个吧。
            </div>
          ) : (
            <div className="space-y-2">
              {mine.map((b) => {
                const h = heat[b!.id];
                return (
                  <div key={b!.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-medium">{b!.id} {b!.name}</div>
                      <span className="text-xs font-medium" style={{ color: densityColor(h.density) }}>{densityLabel(h.density)} · {h.people}人</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full transition-all" style={{ width: `${h.density}%`, background: densityColor(h.density) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* combined order */}
        {visitOrder.length > 0 && (
          <section data-el="crowd-order">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold lg:mb-3 lg:text-base">
              <Route className="size-4 text-accent-foreground" /> 推荐参观顺序
              <span className="text-xs font-normal text-muted-foreground">（结合距离与火爆程度，人多先跳过）</span>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              {visitOrder.map((v, i) => (
                <div key={v.booth.id} className="flex items-center gap-3 py-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.booth.id} {v.booth.name}</div>
                    <div className="text-xs text-muted-foreground">约 {v.dist} 米 · {densityLabel(v.density)}</div>
                  </div>
                  <Link href="/map" className="shrink-0 rounded-full border border-primary px-2.5 py-1 text-xs text-accent-foreground active:bg-accent">查看路线</Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
