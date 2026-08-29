"use client";

import { useMemo, useState } from "react";
import { Navigation, MapPin, Flag, Ruler, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shell/page-shell";
import { CELLS, MAP_W, MAP_H, computeRoute, svgPath, estimateMeters, estimateMinutes } from "@/lib/expo/map-graph";
import { getActiveBooth as getBooth, ACTIVE_FLOOR_PLAN } from "@/lib/expo/DATA_SOURCE";
import { useExpoStore } from "@/stores/expo-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function MapPage() {
  const { mapFrom, mapTo, setMapFrom, setMapTo, interests } = useExpoStore();
  const [pickMode, setPickMode] = useState<"from" | "to">("from");

  const route = useMemo(() => computeRoute(mapFrom, mapTo), [mapFrom, mapTo]);
  const path = svgPath(route);
  const meters = estimateMeters(route);
  const minutes = estimateMinutes(meters);
  const arrow = route.length >= 2 ? route[route.length - 2] : null;
  const arrowTip = route.length >= 1 ? route[route.length - 1] : null;

  const fromBooth = getBooth(mapFrom);
  const toBooth = getBooth(mapTo);

  const pickBooth = (id: string) => {
    const booth = getBooth(id);
    const boothLabel = booth ? `${id} ${booth.name}` : id;

    if (pickMode === "from") {
      if (id === mapTo) setMapTo(mapFrom);
      setMapFrom(id);
      setPickMode("to");
      toast.success(`已将 ${boothLabel} 设为起点，请继续选择终点`, {
        id: "map-pick",
      });
      return;
    }

    if (id === mapFrom) setMapFrom(mapTo);
    setMapTo(id);
    toast.success(`已将 ${boothLabel} 设为终点`, { id: "map-pick" });
  };

  return (
    <PageShell title="展馆路径指引" subtitle="选择起点与目标，查看路线">
      <div className="px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:px-8 lg:py-6">
        {/* legend */}
        <div className="mb-2 flex flex-col gap-2 lg:col-start-1 lg:row-start-1 lg:mb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground lg:text-sm">
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-primary" /> 我感兴趣</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-primary" /> 起点</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-[#0b3525]" /> 终点</span>
            <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-primary" /> 推荐路线</span>
          </div>
          <div
            className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
            data-el="map-pick-mode"
            aria-label="地图点选模式"
          >
            <button
              type="button"
              onClick={() => setPickMode("from")}
              data-el="map-mode-from"
              aria-pressed={pickMode === "from"}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none lg:text-sm ${
                pickMode === "from"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <MapPin className="size-3.5" /> 设置起点
            </button>
            <button
              type="button"
              onClick={() => setPickMode("to")}
              data-el="map-mode-to"
              aria-pressed={pickMode === "to"}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none lg:text-sm ${
                pickMode === "to"
                  ? "bg-[#0b3525] text-white"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Flag className="size-3.5" /> 设置终点
            </button>
          </div>
        </div>

        {/* SVG floor plan */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-sm lg:col-start-1 lg:row-start-2 lg:flex lg:min-h-[680px] lg:items-center lg:justify-center lg:p-5" data-el="map-floorplan">
          <svg viewBox={ACTIVE_FLOOR_PLAN.viewBox ?? `0 0 ${MAP_W} ${MAP_H}`} className="w-full lg:h-[calc(100vh-210px)] lg:max-h-[780px] lg:min-h-[620px] lg:w-auto lg:max-w-full">
            <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#f4f7f5" rx="10" />
            {/* Real floor-plan background image (from the data slot), if provided */}
            {ACTIVE_FLOOR_PLAN.backgroundImage && (
              <image
                href={ACTIVE_FLOOR_PLAN.backgroundImage}
                x="0"
                y="0"
                width={MAP_W}
                height={MAP_H}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.9}
              />
            )}
            {/* corridors implied by gaps; draw entrance/exit labels */}
            <text x={MAP_W / 2} y="20" textAnchor="middle" fontSize="11" fill="#708078">入口</text>
            <text x={MAP_W / 2} y={MAP_H - 8} textAnchor="middle" fontSize="11" fill="#708078">出口</text>

            {/* route (under booths for tip visibility we draw above cells actually) */}
            {CELLS.map((c) => {
              const isFrom = c.id === mapFrom;
              const isTo = c.id === mapTo;
              const isInterest = interests.includes(c.id);
              const fill = isFrom
                ? "#91dc00"
                : isTo
                  ? "#0b3525"
                  : isInterest
                    ? "#74bd00"
                    : "#ffffff";
              const stroke = isFrom
                ? "#74bd00"
                : isTo
                  ? "#164c34"
                  : isInterest
                    ? "#4c8f00"
                    : "#e1e9e3";
              const textFill = isFrom || isInterest ? "#10271d" : isTo ? "#ffffff" : "#708078";
              return (
                <g
                  key={c.id}
                  data-el="map-booth"
                  data-booth-id={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${c.id} ${getBooth(c.id)?.name ?? "展位"}，点击设为${pickMode === "from" ? "起点" : "终点"}`}
                  onClick={() => pickBooth(c.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      pickBooth(c.id);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    rx="6"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isFrom || isTo ? 2 : 1}
                    className="transition-opacity hover:opacity-80"
                  />
                  {(isFrom || isTo) && (
                    <text x={c.cx} y={c.cy - 9} textAnchor="middle" fontSize="9" fontWeight="700" fill={isFrom ? "#10271d" : "#ffffff"}>
                      {isFrom ? "起" : "终"}
                    </text>
                  )}
                  <text x={c.cx} y={c.cy + (isFrom || isTo ? 10 : 4)} textAnchor="middle" fontSize="13" fontWeight="700" fill={textFill}>
                    {c.id}
                  </text>
                </g>
              );
            })}

            {/* route line */}
            {path && (
              <>
                <path d={path} fill="none" stroke="#4c8f00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 8" pointerEvents="none">
                  <animate attributeName="stroke-dashoffset" from="36" to="0" dur="0.9s" repeatCount="indefinite" />
                </path>
                {arrow && arrowTip && (
                  <ArrowHead from={arrow} to={arrowTip} />
                )}
              </>
            )}

            {/* Keep selected labels readable above the animated route. */}
            {CELLS.filter((c) => c.id === mapFrom || c.id === mapTo).map((c) => {
              const isFrom = c.id === mapFrom;
              const markerColor = isFrom ? "#91dc00" : "#0b3525";
              const markerText = isFrom ? "#10271d" : "#ffffff";
              return (
                <g key={`selected-${c.id}`} pointerEvents="none">
                  <text
                    x={c.cx}
                    y={c.cy - 9}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill={markerText}
                    stroke={markerColor}
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {isFrom ? "起" : "终"}
                  </text>
                  <text
                    x={c.cx}
                    y={c.cy + 10}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={markerText}
                    stroke={markerColor}
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {c.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* info + selectors */}
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-[182px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:p-5" data-el="map-info">
          <div className="grid grid-cols-2 gap-3">
            <PickField
              icon={<MapPin className="size-4 text-accent-foreground" />}
              label="起点"
              value={fromBooth ? `${fromBooth.id} ${fromBooth.name}` : "未选择"}
              current={mapFrom}
              onPick={setMapFrom}
              el="map-pick-from"
            />
            <PickField
              icon={<Flag className="size-4 text-[#0b3525]" />}
              label="终点"
              value={toBooth ? `${toBooth.id} ${toBooth.name}` : "未选择"}
              current={mapTo}
              onPick={setMapTo}
              el="map-pick-to"
            />
          </div>

          <div className="mt-3 flex items-center justify-around rounded-xl bg-secondary py-3 text-center">
            <div className="flex flex-col items-center">
              <Ruler className="size-4 text-accent-foreground" />
              <div className="mt-1 text-base font-bold">{meters}<span className="text-xs font-normal"> 米</span></div>
              <div className="text-[11px] text-muted-foreground">预计距离</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <Timer className="size-4 text-accent-foreground" />
              <div className="mt-1 text-base font-bold">{minutes}<span className="text-xs font-normal"> 分钟</span></div>
              <div className="text-[11px] text-muted-foreground">预计步行</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Navigation className="size-3.5 text-accent-foreground" /> {mapFrom} → {mapTo} 绿色路线已高亮
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function ArrowHead({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 9;
  const p1 = { x: to.x - size * Math.cos(angle - Math.PI / 6), y: to.y - size * Math.sin(angle - Math.PI / 6) };
  const p2 = { x: to.x - size * Math.cos(angle + Math.PI / 6), y: to.y - size * Math.sin(angle + Math.PI / 6) };
  return <polygon points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill="#4c8f00" pointerEvents="none" />;
}

function PickField({
  icon,
  label,
  value,
  current,
  onPick,
  el,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  current: string;
  onPick: (id: string) => void;
  el: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        data-el={el}
        className="rounded-xl border border-border bg-secondary p-2.5 text-left transition-colors hover:border-primary hover:bg-accent active:border-primary lg:p-3"
      >
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 truncate text-sm font-medium">{value}</div>
        <div className="mt-0.5 text-[11px] text-accent-foreground">更换 ›</div>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle>选择{label}</SheetTitle>
        </SheetHeader>
        <div className="grid max-h-[50dvh] grid-cols-4 gap-2 overflow-y-auto p-4 lg:grid-cols-8 lg:p-6">
          {CELLS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onPick(c.id);
                setOpen(false);
              }}
              className={`rounded-lg border py-2.5 text-sm font-semibold ${
                current === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {c.id}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
