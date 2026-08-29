"use client";

import { cn } from "@/utils/utils";

export interface ChipItem {
  key: string;
  label: string;
}

/** Horizontally scrollable filter strip; never widens the page. */
export function FilterChips({
  items,
  active,
  onSelect,
  el,
}: {
  items: ChipItem[];
  active: string;
  onSelect: (key: string) => void;
  el?: string;
}) {
  return (
    <div data-el={el ?? "filter-chips"} className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-2.5 pt-0.5">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-[color:var(--ink-2)]",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
