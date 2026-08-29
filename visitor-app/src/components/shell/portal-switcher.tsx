import { ArrowUpRight, Building2, Check, Store, User } from "lucide-react";

const PORTALS = [
  {
    id: "visitor",
    href: "/",
    label: "观众端",
    description: "发现展位与规划行程",
    icon: User,
  },
  {
    id: "exhibitor",
    href: "/exhibitor",
    label: "展商端",
    description: "管理展位与预约",
    icon: Store,
  },
  {
    id: "operations",
    href: "/operations",
    label: "场馆运营端",
    description: "进入场馆运营工作台",
    icon: Building2,
  },
] as const;

export function PortalSwitcher() {
  return (
    <nav
      aria-label="三端门户切换"
      data-el="portal-switcher"
      className="relative z-20 mx-4 -mt-4 rounded-2xl border border-border bg-card p-3 shadow-md lg:mx-auto lg:-mt-7 lg:w-[calc(100%-8rem)] lg:max-w-6xl lg:rounded-3xl lg:p-5"
    >
      <div className="mb-3 flex items-end justify-between gap-4 lg:mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground lg:text-xs">
            三端一键切换
          </p>
          <h2 className="mt-0.5 text-sm font-semibold lg:text-xl">选择你要使用的门户</h2>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">同一入口，按角色进入</span>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {PORTALS.map((portal) => {
          const active = portal.id === "visitor";
          const Icon = portal.icon;
          return (
            <a
              key={portal.id}
              href={portal.href}
              aria-current={active ? "page" : undefined}
              data-portal={portal.id}
              data-active={active ? "true" : "false"}
              className={`group flex min-h-[72px] min-w-0 flex-col justify-between rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-[92px] lg:rounded-2xl lg:p-4 ${
                active
                  ? "border-primary bg-accent text-foreground shadow-sm"
                  : "border-border bg-secondary text-foreground hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/60 hover:shadow-sm"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg lg:size-10 lg:rounded-xl ${
                    active ? "bg-primary text-primary-foreground" : "bg-card text-accent-foreground"
                  }`}
                >
                  <Icon className="size-4 lg:size-5" aria-hidden="true" />
                </span>
                {active ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-accent-foreground lg:text-xs">
                    <Check className="size-3" aria-hidden="true" /> 当前
                  </span>
                ) : (
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-2 block min-w-0">
                <strong className="block text-xs leading-tight sm:text-sm lg:text-base">{portal.label}</strong>
                <small className="mt-1 hidden text-xs text-muted-foreground lg:block">
                  {portal.description}
                </small>
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
