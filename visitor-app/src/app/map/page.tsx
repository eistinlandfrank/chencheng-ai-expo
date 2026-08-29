"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  Flag,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Ruler,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shell/page-shell";
import {
  CELLS,
  CODING_COLUMNS,
  CODING_POSITION_COUNT,
  CODING_ROWS,
  CODING_TABLE_COUNT,
  CODING_ZONE_META,
  MAIN_AISLE_RECTS,
  MAP_H,
  MAP_W,
  TABLES_PER_POSITION,
  computeRoute,
  estimateMeters,
  estimateMinutes,
  getCell,
  svgPath,
  toSvgPoint,
  type Cell,
} from "@/lib/expo/map-graph";
import { useExpoStore } from "@/stores/expo-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MapMode = "browse" | "route";

const COLUMN_HEADERS = ["硬件", "硬件/AIGC", "游戏", "软件", "软件"];

export default function MapPage() {
  const { mapFrom, mapTo, setMapFrom, setMapTo } = useExpoStore();
  const [mapMode, setMapMode] = useState<MapMode>("browse");
  const [pickMode, setPickMode] = useState<"from" | "to">("from");
  const [selectedId, setSelectedId] = useState("01");

  const route = useMemo(() => computeRoute(mapFrom, mapTo), [mapFrom, mapTo]);
  const path = mapMode === "route" ? svgPath(route) : "";
  const meters = estimateMeters(route);
  const minutes = estimateMinutes(meters);
  const arrow =
    mapMode === "route" && route.length >= 2
      ? toSvgPoint(route[route.length - 2])
      : null;
  const arrowTip =
    mapMode === "route" && route.length >= 1
      ? toSvgPoint(route[route.length - 1])
      : null;

  const fromPosition = getCell(mapFrom);
  const toPosition = getCell(mapTo);
  const selectedPosition = getCell(selectedId) ?? CELLS[0];

  const pickRoutePosition = (id: string) => {
    const positionLabel = getCell(id)?.label ?? `Coding ${id}号位（3桌）`;

    if (pickMode === "from") {
      if (id === mapTo) setMapTo(mapFrom);
      setMapFrom(id);
      setPickMode("to");
      toast.success(`已将 ${positionLabel} 设为起点，请继续选择终点`, {
        id: "map-pick",
      });
      return;
    }

    if (id === mapFrom) setMapFrom(mapTo);
    setMapTo(id);
    toast.success(`已将 ${positionLabel} 设为终点`, { id: "map-pick" });
  };

  const handlePositionClick = (id: string) => {
    if (mapMode === "browse") {
      setSelectedId(id);
      return;
    }
    pickRoutePosition(id);
  };

  const startRouteFrom = (id: string) => {
    setMapFrom(id);
    if (id === mapTo) setMapTo(id === "75" ? "01" : "75");
    setPickMode("to");
    setMapMode("route");
  };

  const routeTo = (id: string) => {
    setMapTo(id);
    if (id === mapFrom) setMapFrom(id === "01" ? "75" : "01");
    setPickMode("from");
    setMapMode("route");
  };

  return (
    <PageShell
      title="Coding 区路径指引"
      subtitle={`${CODING_COLUMNS} 列 × ${CODING_ROWS} 行 · ${CODING_POSITION_COUNT} 个编号 · ${CODING_TABLE_COUNT} 张桌子`}
    >
      <div className="px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:px-8 lg:py-6">
        <div className="mb-3 flex flex-col gap-3 lg:col-start-1 lg:row-start-1 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground" data-el="map-zone-legend">
            {Object.values(CODING_ZONE_META).map((zone) => (
              <span key={zone.label} className="flex items-center gap-1">
                <i
                  className="size-3 rounded border"
                  style={{ backgroundColor: zone.fill, borderColor: zone.stroke }}
                />
                {zone.label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <i className="size-3 rounded border border-dashed border-[#ef5b75] bg-[#fde8ed]" />
              特别评分区（Workshop）
            </span>
            <span className="flex items-center gap-1">
              <i className="size-3 rounded bg-accent" /> 2.4m 主通道
            </span>
            {mapMode === "route" && (
              <>
                <span className="flex items-center gap-1"><i className="size-3 rounded bg-primary" /> 起点</span>
                <span className="flex items-center gap-1"><i className="size-3 rounded bg-[#0b3525]" /> 终点</span>
                <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-primary" /> 推荐路线</span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div
              className="flex items-center rounded-xl border border-border bg-card p-1 shadow-sm"
              data-el="map-view-mode"
              aria-label="地图使用模式"
            >
              <button
                type="button"
                onClick={() => setMapMode("browse")}
                aria-pressed={mapMode === "browse"}
                className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none ${
                  mapMode === "browse"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Eye className="size-3.5" /> 浏览展位
              </button>
              <button
                type="button"
                onClick={() => setMapMode("route")}
                aria-pressed={mapMode === "route"}
                className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none ${
                  mapMode === "route"
                    ? "bg-[#0b3525] text-white"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <RouteIcon className="size-3.5" /> 路线规划
              </button>
            </div>

            {mapMode === "route" && (
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
                  className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none ${
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
                  className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none ${
                    pickMode === "to"
                      ? "bg-[#0b3525] text-white"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Flag className="size-3.5" /> 设置终点
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-sm lg:col-start-1 lg:row-start-2 lg:flex lg:min-h-[680px] lg:items-center lg:justify-center lg:p-5" data-el="map-floorplan">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full lg:h-[calc(100vh-210px)] lg:max-h-[780px] lg:min-h-[620px] lg:w-auto lg:max-w-full">
            <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#f4f7f5" rx="10" />
            <text x={MAP_W / 2} y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#244237">
              Coding 区 · 点击编号查看详情
            </text>

            <g data-el="map-special-zone" pointerEvents="none">
              <rect x="8" y="244" width="52" height="118" rx="7" fill="#fde8ed" stroke="#ef5b75" strokeWidth="1.5" strokeDasharray="5 4" />
              <text x="34" y="278" textAnchor="middle" fontSize="8" fontWeight="700" fill="#b93450">特别</text>
              <text x="34" y="292" textAnchor="middle" fontSize="8" fontWeight="700" fill="#b93450">评分区</text>
              <text x="34" y="343" textAnchor="middle" fontSize="6.5" fill="#b93450">Workshop</text>
            </g>

            {MAIN_AISLE_RECTS.map((aisle, index) => (
              <rect key={`main-aisle-${index}`} {...aisle} rx="4" fill="#e8f5df" stroke="#d2e9c5" strokeWidth="0.8" />
            ))}

            {CELLS.filter((cell) => cell.row === 0).map((cell) => (
              <g key={`column-${cell.column}`}>
                <text x={cell.cx} y="29" textAnchor="middle" fontSize="6.8" fontWeight="700" fill={CODING_ZONE_META[cell.zone].stroke}>
                  {COLUMN_HEADERS[cell.column]}
                </text>
                <text x={cell.cx} y="39" textAnchor="middle" fontSize="7" fill="#708078">
                  {cell.column + 1}列
                </text>
              </g>
            ))}
            {CELLS.filter((cell) => cell.column === 0).map((cell) => (
              <text key={`row-${cell.row}`} x="68" y={cell.cy + 3} textAnchor="middle" fontSize="7" fill="#98a59f">
                {cell.row + 1}
              </text>
            ))}

            {CELLS.map((cell) => (
              <MapPosition
                key={cell.id}
                cell={cell}
                mapMode={mapMode}
                pickMode={pickMode}
                isSelected={mapMode === "browse" && selectedId === cell.id}
                isFrom={mapMode === "route" && mapFrom === cell.id}
                isTo={mapMode === "route" && mapTo === cell.id}
                onClick={() => handlePositionClick(cell.id)}
              />
            ))}

            {path && (
              <>
                <path d={path} fill="none" stroke="#4c8f00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 8" pointerEvents="none">
                  <animate attributeName="stroke-dashoffset" from="36" to="0" dur="0.9s" repeatCount="indefinite" />
                </path>
                {arrow && arrowTip && <ArrowHead from={arrow} to={arrowTip} />}
              </>
            )}

            {mapMode === "route" &&
              CELLS.filter((cell) => cell.id === mapFrom || cell.id === mapTo).map((cell) => {
                const isFrom = cell.id === mapFrom;
                const markerColor = isFrom ? "#91dc00" : "#0b3525";
                const markerText = isFrom ? "#10271d" : "#ffffff";
                return (
                  <g key={`selected-${cell.id}`} pointerEvents="none">
                    <text x={cell.cx} y={cell.cy - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={markerText} stroke={markerColor} strokeWidth="3" paintOrder="stroke">
                      {isFrom ? "起" : "终"}
                    </text>
                    <text x={cell.cx} y={cell.cy + 7} textAnchor="middle" fontSize="10" fontWeight="700" fill={markerText} stroke={markerColor} strokeWidth="3" paintOrder="stroke">
                      {cell.id}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-[182px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:p-5" data-el="map-info">
          {mapMode === "browse" ? (
            <PositionDetails
              position={selectedPosition}
              onStartRoute={() => startRouteFrom(selectedPosition.id)}
              onRouteTo={() => routeTo(selectedPosition.id)}
            />
          ) : (
            <RouteDetails
              mapFrom={mapFrom}
              mapTo={mapTo}
              fromPosition={fromPosition}
              toPosition={toPosition}
              meters={meters}
              minutes={minutes}
              setMapFrom={setMapFrom}
              setMapTo={setMapTo}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

function MapPosition({
  cell,
  mapMode,
  pickMode,
  isSelected,
  isFrom,
  isTo,
  onClick,
}: {
  cell: Cell;
  mapMode: MapMode;
  pickMode: "from" | "to";
  isSelected: boolean;
  isFrom: boolean;
  isTo: boolean;
  onClick: () => void;
}) {
  const zone = CODING_ZONE_META[cell.zone];
  const fill = isFrom ? "#91dc00" : isTo ? "#0b3525" : zone.fill;
  const stroke = isFrom ? "#74bd00" : isTo ? "#164c34" : zone.stroke;
  const textFill = isFrom ? "#10271d" : isTo ? "#ffffff" : "#244237";

  return (
    <g
      data-el="map-booth"
      data-position-id={cell.id}
      role="button"
      tabIndex={0}
      aria-label={`${cell.label}，${zone.label}，点击${
        mapMode === "browse" ? "查看详情" : `设为${pickMode === "from" ? "起点" : "终点"}`
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer outline-none"
    >
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        rx="4"
        fill={fill}
        stroke={stroke}
        strokeWidth={isSelected ? 2.8 : isFrom || isTo ? 2 : 1.1}
        className="transition-opacity hover:opacity-80"
      />
      {[1, 2].map((divider) => (
        <line
          key={divider}
          x1={cell.x + (cell.w * divider) / TABLES_PER_POSITION}
          x2={cell.x + (cell.w * divider) / TABLES_PER_POSITION}
          y1={cell.y + 2}
          y2={cell.y + cell.h - 2}
          stroke={isTo ? "#789287" : zone.stroke}
          strokeWidth="1.1"
          opacity="0.7"
          pointerEvents="none"
        />
      ))}
      {isSelected && <circle cx={cell.x + cell.w - 3.5} cy={cell.y + 3.5} r="2" fill={zone.stroke} pointerEvents="none" />}
      {(isFrom || isTo) && (
        <text x={cell.cx} y={cell.cy - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={textFill} pointerEvents="none">
          {isFrom ? "起" : "终"}
        </text>
      )}
      <text x={cell.cx} y={cell.cy + (isFrom || isTo ? 7 : 3)} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={textFill} pointerEvents="none">
        {cell.id}
      </text>
    </g>
  );
}

function PositionDetails({
  position,
  onStartRoute,
  onRouteTo,
}: {
  position: Cell;
  onStartRoute: () => void;
  onRouteTo: () => void;
}) {
  const zone = CODING_ZONE_META[position.zone];
  return (
    <div data-el="map-position-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: zone.stroke }}>
            <i className="size-2.5 rounded-full" style={{ backgroundColor: zone.stroke }} />
            {zone.label}
          </div>
          <h2 className="mt-1 text-xl font-bold">Coding {position.id}号位</h2>
          <p className="mt-1 text-xs text-muted-foreground">三张紧凑桌共用此编号</p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: zone.fill, color: zone.stroke }}>
          {zone.shortLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <DetailStat label="地图位置" value={`第 ${position.row + 1} 行 · 第 ${position.column + 1} 列`} />
        <DetailStat label="桌位组成" value={`${TABLES_PER_POSITION} 张紧凑桌`} />
        <DetailStat label="展位编号" value={`Coding ${position.id}`} />
        <DetailStat label="所属区域" value={zone.label} />
      </div>

      <div className="mt-3 rounded-xl border p-3 text-xs leading-5" style={{ borderColor: zone.stroke, backgroundColor: zone.fill }}>
        {zone.description}
      </div>

      <div className="mt-3 rounded-xl bg-secondary p-3">
        <div className="text-sm font-medium">项目资料暂未登记</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          团队名称、项目简介和负责人信息接入后会显示在这里。
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onStartRoute} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-medium hover:border-primary hover:bg-accent">
          <MapPin className="size-4" /> 从这里出发
        </button>
        <button type="button" onClick={onRouteTo} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Navigation className="size-4" /> 导航到这里
        </button>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function RouteDetails({
  mapFrom,
  mapTo,
  fromPosition,
  toPosition,
  meters,
  minutes,
  setMapFrom,
  setMapTo,
}: {
  mapFrom: string;
  mapTo: string;
  fromPosition?: Cell;
  toPosition?: Cell;
  meters: number;
  minutes: number;
  setMapFrom: (id: string) => void;
  setMapTo: (id: string) => void;
}) {
  return (
    <div data-el="map-route-detail">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <RouteIcon className="size-4 text-accent-foreground" /> 路线规划
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PickField icon={<MapPin className="size-4 text-accent-foreground" />} label="起点" value={fromPosition?.label ?? "未选择"} current={mapFrom} onPick={setMapFrom} el="map-pick-from" />
        <PickField icon={<Flag className="size-4 text-[#0b3525]" />} label="终点" value={toPosition?.label ?? "未选择"} current={mapTo} onPick={setMapTo} el="map-pick-to" />
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
        <Navigation className="size-3.5 text-accent-foreground" /> Coding {mapFrom} → Coding {mapTo} 绿色路线已高亮
      </div>
      <div className="mt-3 border-t border-border pt-3 text-center text-[11px] leading-5 text-muted-foreground" data-el="map-data-source-note">
        距离依据 62 米场地标注、75 个编号位与通道位置计算
      </div>
    </div>
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
      <SheetTrigger data-el={el} className="rounded-xl border border-border bg-secondary p-2.5 text-left transition-colors hover:border-primary hover:bg-accent active:border-primary lg:p-3">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 truncate text-sm font-medium">{value}</div>
        <div className="mt-0.5 text-[11px] text-accent-foreground">更换 ›</div>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle>选择{label}</SheetTitle>
        </SheetHeader>
        <div className="grid max-h-[50dvh] grid-cols-5 gap-2 overflow-y-auto p-4 lg:p-6">
          {CELLS.map((cell) => (
            <button
              key={cell.id}
              onClick={() => {
                onPick(cell.id);
                setOpen(false);
              }}
              className={`rounded-lg border py-2.5 text-sm font-semibold ${
                current === cell.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              C{cell.id}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
