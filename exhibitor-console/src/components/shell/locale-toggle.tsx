"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  changeLocale,
  getLocalePreference,
  normalizeLocale,
  type LocaleCode,
  type LocalePreference,
} from "@/i18n";

/** Compact language toggle styled for the blue-white console header. */
export function LocaleToggle() {
  const { i18n } = useTranslation();

  const subscribe = useCallback(
    (sync: () => void) => {
      i18n.on("languageChanged", sync);
      window.addEventListener("eazo-locale-preference-changed", sync);
      window.addEventListener("storage", sync);
      return () => {
        i18n.off("languageChanged", sync);
        window.removeEventListener("eazo-locale-preference-changed", sync);
        window.removeEventListener("storage", sync);
      };
    },
    [i18n],
  );

  const preference = useSyncExternalStore(
    subscribe,
    getLocalePreference,
    () => "system" as LocalePreference,
  );

  const active = normalizeLocale(i18n.resolvedLanguage || i18n.language) ?? "en-US";
  const next: LocaleCode = active === "zh-CN" ? "en-US" : "zh-CN";

  return (
    <button
      data-el="locale-toggle"
      onClick={() => void changeLocale(next)}
      aria-label="Language"
      className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-sm active:scale-95"
      title={preference === "system" ? "System" : active}
    >
      <Languages className="h-3.5 w-3.5" aria-hidden />
      {active === "zh-CN" ? "中" : "EN"}
    </button>
  );
}
