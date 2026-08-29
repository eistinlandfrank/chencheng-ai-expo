"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Plus,
  Navigation,
  MessageCircle,
  Info,
  Clock,
  MapPin,
  Check,
} from "lucide-react";
import { PageShell } from "@/components/shell/page-shell";
import { BoothThumb } from "@/components/expo/booth-thumb";
import { getActiveBooth as getBooth } from "@/lib/expo/DATA_SOURCE";
import { useExpoStore } from "@/stores/expo-store";
import { toast } from "sonner";

export default function BoothDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const booth = getBooth(id);
  const {
    isInterested,
    toggleInterest,
    inItinerary,
    addToItinerary,
    setMapTo,
    currentBoothId,
    setMapFrom,
  } = useExpoStore();

  if (!booth) {
    return (
      <PageShell title="展位详情" back>
        <div className="mt-16 text-center text-sm text-muted-foreground">
          未找到该展位。
        </div>
      </PageShell>
    );
  }

  const added = inItinerary(booth.id);

  const goHere = () => {
    setMapFrom(currentBoothId);
    setMapTo(booth.id);
    router.push("/map");
  };

  return (
    <PageShell
      title={`${booth.id} 展位详情`}
      back
      right={
        <button
          onClick={() => toggleInterest(booth.id)}
          data-el="detail-fav"
          className="flex size-8 items-center justify-center rounded-full active:bg-secondary"
          aria-label="收藏"
        >
          <Heart
            className={`size-5 ${
              isInterested(booth.id)
                ? "fill-primary text-accent-foreground"
                : "text-muted-foreground"
            }`}
          />
        </button>
      }
    >
      <div className="px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] lg:items-start lg:gap-x-8 lg:px-8 lg:py-6 lg:pb-28">
        {/* video embed (demo cover) */}
        <div
          data-el="detail-video"
          className="overflow-hidden rounded-2xl border border-border shadow-sm transition-shadow hover:shadow-lg lg:sticky lg:top-[182px] lg:col-start-1 lg:row-span-4 lg:row-start-1 lg:cursor-pointer"
          onClick={() => toast("演示视频（Demo 占位）")}
          role="button"
        >
          <BoothThumb booth={booth} className="aspect-video w-full lg:aspect-[4/3]" showPlay />
        </div>

        <div className="mt-4 lg:col-start-2 lg:row-start-1 lg:mt-0">
          <h2 className="text-lg font-bold lg:text-3xl">
            {booth.id} {booth.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground lg:mt-3 lg:text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {booth.zone}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> 推荐参观 {booth.recommendMinutes} 分钟
            </span>
          </div>
        </div>

        {/* keywords */}
        <div className="mt-3 flex flex-wrap gap-2 lg:col-start-2 lg:row-start-2 lg:mt-5" data-el="detail-keywords">
          {booth.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
            >
              # {k}
            </span>
          ))}
        </div>

        {/* intro */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-start-2 lg:row-start-3 lg:mt-6 lg:p-5">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Info className="size-4 text-accent-foreground" /> 展位简介
          </div>
          <p className="text-sm leading-6 text-secondary-foreground">{booth.intro}</p>
        </section>

        {/* owner contact */}
        <section className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-start-2 lg:row-start-4 lg:mt-4 lg:p-5">
          <div className="text-sm font-semibold">展位负责人</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-accent-foreground">
              {booth.owner.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {booth.owner.name} · {booth.owner.role}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {booth.owner.org}
              </div>
            </div>
            <button
              onClick={() => toast.success("已发送留言，负责人会尽快联系你")}
              data-el="detail-contact"
              className="flex items-center gap-1 rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-accent-foreground active:bg-accent"
            >
              <MessageCircle className="size-3.5" /> 一键联络
            </button>
          </div>
        </section>
      </div>

      {/* sticky actions */}
      <div
        className="fixed inset-x-0 bottom-[64px] z-30 mx-auto flex max-w-md gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[420px] lg:max-w-none lg:rounded-2xl lg:border lg:p-4 lg:shadow-xl xl:w-[500px]"
        data-el="detail-actions"
      >
        <button
          onClick={() => {
            if (added) return;
            addToItinerary(booth.id);
            toast.success("已加入行程");
          }}
          data-el="detail-add-trip"
          disabled={added}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold ${
            added
              ? "bg-secondary text-muted-foreground"
              : "bg-primary text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[.99]"
          }`}
        >
          {added ? <Check className="size-4" /> : <Plus className="size-4" />}
          {added ? "已在行程" : "加入行程"}
        </button>
        <button
          onClick={goHere}
          data-el="detail-goto"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent active:bg-accent"
        >
          <Navigation className="size-4" /> 去这里
        </button>
      </div>
    </PageShell>
  );
}
