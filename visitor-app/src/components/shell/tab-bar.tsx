"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutGrid,
  Bot,
  Map,
  Activity,
  User,
  Bell,
} from "lucide-react";
import { cn } from "@/utils/utils";

const TABS = [
  { href: "/", label: "首页", icon: Sparkles, el: "nav-home" },
  { href: "/booths", label: "展位库", icon: LayoutGrid, el: "nav-booths" },
  { href: "/map", label: "地图", icon: Map, el: "nav-map" },
  { href: "/assistant", label: "AI助手", icon: Bot, el: "nav-assistant", center: true },
  { href: "/crowd", label: "人流", icon: Activity, el: "nav-crowd" },
  { href: "/me", label: "我的", icon: User, el: "nav-me" },
];

export function TabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        data-el="app-topbar"
        className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between border-b border-border bg-card px-4 lg:h-[76px] lg:px-12"
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="返回首页">
          <span className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-card text-foreground lg:size-11">
            <Bot className="size-5 lg:size-6" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground lg:text-lg">
            智能展会 <span className="text-accent-foreground">AI</span>
          </span>
        </Link>
        <span
          className="flex size-11 items-center justify-center rounded-full text-foreground"
          aria-label="通知"
        >
          <Bell className="size-5" />
        </span>
      </header>

      <nav
        data-el="tab-bar"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-stretch justify-around border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
      >
        {TABS.map((t) => {
          const active = isActive(t.href);
          const Icon = t.icon;
          if (t.center) {
            return (
              <Link
                key={t.href}
                href={t.href}
                data-el={t.el}
                className="relative -mt-5 flex flex-col items-center px-1"
              >
                <span
                  className={cn(
                  "flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
                )}
                  style={{ boxShadow: "0 8px 20px rgba(116,189,0,.28)" }}
                >
                  <Icon className="size-6" />
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[10px]",
                    active ? "font-medium text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={t.href}
              href={t.href}
              data-el={t.el}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <Icon
                className={cn(
                  "size-5 transition-colors",
                  active ? "text-accent-foreground" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-[10px]",
                  active ? "font-medium text-accent-foreground" : "text-muted-foreground",
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <aside
        data-el="desktop-sidebar"
        className="fixed bottom-0 left-0 top-[76px] z-40 hidden w-[104px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex"
      >
        <nav className="flex flex-1 flex-col gap-2" aria-label="桌面主导航">
          {TABS.map((t) => {
            const active = isActive(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                data-el={`${t.el}-desktop`}
                className={cn(
                  "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-l-[3px] px-2 py-3 text-xs font-medium transition-all",
                  active
                    ? "border-l-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-6" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
