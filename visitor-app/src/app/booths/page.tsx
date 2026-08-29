"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Heart } from "lucide-react";
import { PageShell } from "@/components/shell/page-shell";
import { BoothThumb } from "@/components/expo/booth-thumb";
import { CATEGORY_FILTERS, type BoothCategory } from "@/lib/expo/booths";
import { ACTIVE_BOOTHS as BOOTHS } from "@/lib/expo/DATA_SOURCE";
import { useExpoStore } from "@/stores/expo-store";

export default function BoothsPage() {
  const { isInterested, toggleInterest } = useExpoStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | BoothCategory>("all");

  const list = useMemo(() => {
    return BOOTHS.filter((b) => {
      const okCat = cat === "all" || b.category === cat;
      const okQ =
        !q.trim() ||
        b.name.includes(q.trim()) ||
        b.id.includes(q.trim()) ||
        b.keywords.some((k) => k.includes(q.trim()));
      return okCat && okQ;
    });
  }, [q, cat]);

  return (
    <PageShell title="展位库" subtitle={`共 ${BOOTHS.length} 个展位`}>
      <div className="sticky top-[128px] z-20 space-y-3 bg-secondary px-4 pb-2 pt-3 lg:top-[190px] lg:mx-8 lg:grid lg:grid-cols-[minmax(320px,480px)_1fr] lg:items-center lg:gap-5 lg:space-y-0 lg:bg-background lg:px-0 lg:py-5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm lg:px-4 lg:py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            data-el="booth-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索展位名称、编号或关键词"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:justify-end lg:px-0 lg:pb-0" data-el="booth-filters">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setCat(f.key)}
              data-el="booth-filter-chip"
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                cat === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-1 lg:px-8 lg:pb-10 lg:pt-2">
        {list.length === 0 ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            没有匹配的展位，换个关键词试试。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
            {list.map((b) => (
              <Link
                key={b.id}
                href={`/booths/${b.id}`}
                data-el="booth-card"
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg active:scale-[.99]"
              >
                <div className="relative">
                  <BoothThumb booth={b} className="h-24 w-full lg:h-36" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleInterest(b.id);
                    }}
                    data-el="booth-fav"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 shadow"
                    aria-label="收藏"
                  >
                    <Heart
                      className={`size-4 ${
                        isInterested(b.id)
                          ? "fill-primary text-accent-foreground"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                <div className="p-2.5 lg:p-4">
                  <div className="truncate text-sm font-medium lg:text-base">{b.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground lg:mt-1.5 lg:text-sm">
                    {b.zone} · 推荐 {b.recommendMinutes} 分钟
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
