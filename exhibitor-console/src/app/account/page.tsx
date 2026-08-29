"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, LogOut, BadgeCheck } from "lucide-react";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { AuthGate } from "@/components/shell/auth-gate";
import { fetchMyBooth, type Booth } from "@/lib/api";

function AccountInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useEazo((s) => s.auth.user);
  const [booth, setBooth] = useState<Booth | null>(null);

  useEffect(() => {
    fetchMyBooth().then(setBooth).catch(() => undefined);
  }, []);

  return (
    <>
      <div className="fade-up flex items-center gap-3 rounded-[15px] border border-border bg-background p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{user?.name ?? user?.email ?? user?.id}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
            <BadgeCheck className="h-3 w-3" /> {t("account.roleExhibitor")}
          </div>
        </div>
      </div>

      <div className="fade-up mt-4 rounded-[15px] border border-border bg-background p-4">
        <div className="mb-2 text-[11px] font-semibold text-muted-foreground">{t("account.boundBooth")}</div>
        {booth ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("account.boothId")}</span>
              <span className="heading font-bold text-[color:var(--ink-2)]">{booth.id}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("booth.sections.name")}</span>
              <span className="truncate font-semibold">{booth.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("account.boothStatus")}</span>
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary">
                {t(`account.status.${booth.status}`)}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        )}
        <button
          data-el="account-edit-booth"
          onClick={() => router.push("/booth")}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:scale-95"
        >
          <Store className="h-4 w-4" /> {t("account.editBooth")}
        </button>
      </div>

      <button
        data-el="account-signout"
        onClick={() => auth.logout()}
        className="fade-up mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background py-2.5 text-sm font-bold text-muted-foreground active:scale-95"
      >
        <LogOut className="h-4 w-4" /> {t("account.signOut")}
      </button>
    </>
  );
}

export default function AccountPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <PageHeader
        kicker={t("account.kicker")}
        title={t("account.title")}
        subtitle={t("account.subtitle")}
        showLocale
        mark={<span className="heading text-sm font-bold">我</span>}
      />
      <AuthGate>
        <AccountInner />
      </AuthGate>
    </AppShell>
  );
}
