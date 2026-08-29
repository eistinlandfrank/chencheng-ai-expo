"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, Users, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/utils";

const TABS = [
  { route: "/", key: "home", Icon: LayoutDashboard },
  { route: "/booth", key: "booth", Icon: Store },
  { route: "/appointments", key: "audience", Icon: Users },
  { route: "/account", key: "account", Icon: UserRound },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <nav
      data-el="app-tabbar"
      aria-label={t("nav.home")}
      className="fixed left-1/2 z-30 grid w-[min(calc(100%-28px),402px)] -translate-x-1/2 grid-cols-4 gap-1 rounded-[18px] border border-border bg-background/95 p-2 shadow-[0_14px_36px_rgba(20,37,69,0.14)] backdrop-blur"
      style={{ bottom: "calc(max(34px, env(safe-area-inset-bottom, 0px)) - 22px)" }}
    >
      {TABS.map(({ route, key, Icon }) => {
        const active = pathname === route;
        return (
          <button
            key={route}
            data-el={`nav-${key}`}
            onClick={() => router.push(route)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition active:scale-95",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            <span className="truncate">{t(`nav.${key}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
