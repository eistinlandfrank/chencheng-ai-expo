"use client";

import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { useTranslation } from "react-i18next";

/**
 * Gates exhibitor content behind Eazo auth. Shows a spinner while resolving,
 * a login prompt when signed out, and the children once a user is present.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm">{t("auth.loading")}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div data-el="auth-gate" className="fade-up flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LogIn className="h-6 w-6" />
        </div>
        <h2 className="heading text-lg font-bold">{t("auth.required")}</h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t("auth.requiredDesc")}</p>
        <button
          data-el="auth-login"
          onClick={() => auth.login().catch(() => undefined)}
          className="mt-1 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_18px_rgba(27,79,216,0.22)] active:scale-95"
        >
          {t("auth.login")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
