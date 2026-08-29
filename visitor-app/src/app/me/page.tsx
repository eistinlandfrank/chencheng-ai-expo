"use client";

import Link from "next/link";
import {
  MapPin,
  Heart,
  CircleCheck,
  UserRound,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/shell/page-shell";
import { getActiveBooth as getBooth } from "@/lib/expo/DATA_SOURCE";
import { useExpoStore } from "@/stores/expo-store";

export default function MePage() {
  const { currentBoothId, interests, checkins } = useExpoStore();
  const current = getBooth(currentBoothId);

  return (
    <PageShell title="我的">
      <div className="space-y-4 px-4 pt-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0 lg:px-8 lg:py-6">
        <div
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-8 lg:min-h-32 lg:p-6"
          data-el="me-profile"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-accent-foreground">
            <UserRound className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">本机观展记录</div>
            <div className="text-xs text-muted-foreground">
              兴趣、行程和打卡仅保存在当前浏览器
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3.5" /> 无需登录
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-4 lg:min-h-32 lg:p-6" data-el="me-current">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><MapPin className="size-4 text-accent-foreground" /> 当前所在区位</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm">{current ? `${current.zone} · ${current.id} ${current.name}` : "尚未定位"}</div>
            <Link href="/map" className="flex items-center text-xs text-accent-foreground">去地图 <ChevronRight className="size-3.5" /></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-1 lg:gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Heart className="size-3.5 text-accent-foreground" /> 感兴趣</div>
            <div className="mt-1 text-2xl font-bold">{interests.length}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleCheck className="size-3.5 text-emerald-600" /> 已打卡</div>
            <div className="mt-1 text-2xl font-bold">{checkins.length}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-8 lg:min-h-full lg:p-6" data-el="me-interests">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Heart className="size-4 text-accent-foreground" /> 我标记的展位</div>
          {interests.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">还没有标记，去展位库看看吧</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interests.map((id) => {
                const booth = getBooth(id);
                if (!booth) return null;
                return <Link key={id} href={`/booths/${id}`} className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">{id} {booth.name}</Link>;
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-12 lg:p-6" data-el="me-checkins">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><CircleCheck className="size-4 text-emerald-600" /> 已打卡区位</div>
          {checkins.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">尚未打卡任何展位</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {checkins.map((id) => {
                const booth = getBooth(id);
                return <span key={id} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"><CircleCheck className="size-3" /> {id} {booth?.name}</span>;
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
