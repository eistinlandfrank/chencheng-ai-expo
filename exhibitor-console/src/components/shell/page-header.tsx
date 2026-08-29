"use client";

import type { ReactNode } from "react";
import { LocaleToggle } from "@/components/shell/locale-toggle";

/** Shared editorial page header: kicker + title + subtitle. The locale toggle
 *  is global and lives only on the account page (showLocale). */
export function PageHeader({
  kicker,
  title,
  subtitle,
  mark,
  showLocale = false,
  action,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  mark?: ReactNode;
  showLocale?: boolean;
  action?: ReactNode;
}) {
  return (
    <header data-el="page-header" className="fade-up grid grid-cols-[1fr_auto] items-start gap-3 px-0.5 pb-3.5 pt-1">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-primary">
          {kicker}
        </div>
        <h1 className="heading mt-1 truncate text-[22px] font-bold leading-[1.12]">{title}</h1>
        <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        {showLocale && <LocaleToggle />}
        {mark && (
          <div className="grid h-[43px] w-[43px] place-items-center rounded-[8px] bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(27,79,216,0.18)]">
            {mark}
          </div>
        )}
      </div>
    </header>
  );
}
