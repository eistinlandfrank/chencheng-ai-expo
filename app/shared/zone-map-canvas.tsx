'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Zone, ExpoDay, HeatmapData, Point } from './types';

type Props = {
  zones: Zone[];
  currentDay: ExpoDay;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  heatmapData?: HeatmapData;
  showLabels?: boolean;
};

/** 展馆宽高比 3:1，逻辑空间 x:0-100, y:0-33 */
const LOGICAL_W = 100;
const LOGICAL_H = 33;

function toCanvas(p: Point, cw: number, ch: number): { cx: number; cy: number } {
  return { cx: (p.x / LOGICAL_W) * cw, cy: (p.y / LOGICAL_H) * ch };
}

/** 热力色插值：绿(0) → 橙(0.5) → 红(1) */
function heatColor(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.5) {
    const t = v / 0.5;
    const r = Math.round(82 + (255 - 82) * t);
    const g = Math.round(196 + (165 - 196) * t);
    const b = Math.round(26 + (0 - 26) * t);
    const a = 0.1 + t * 0.25;
    return `rgba(${r},${g},${b},${a})`;
  }
  const t = (v - 0.5) / 0.5;
  const r = 255;
  const g = Math.round(165 - 115 * t);
  const b = Math.round(50 * t);
  const a = 0.35 + t * 0.15;
  return `rgba(${r},${g},${b},${a})`;
}

/** 构建多边形路径 */
function buildPath(ctx: CanvasRenderingContext2D, polygon: Point[], cw: number, ch: number) {
  ctx.beginPath();
  polygon.forEach((p, i) => {
    const { cx, cy } = toCanvas(p, cw, ch);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.closePath();
}

export default function ZoneMapCanvas({
  zones, currentDay, selectedZoneId, onSelectZone,
  heatmapData, showLabels = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = cw * (LOGICAL_H / LOGICAL_W); // 保持宽高比

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // 1. 背景
    ctx.fillStyle = '#F7F8FA';
    ctx.fillRect(0, 0, cw, ch);

    // 2. 展馆外框
    ctx.strokeStyle = '#D9D9D9';
    ctx.lineWidth = 2;
    const margin = 1;
    ctx.strokeRect(margin, margin, cw - margin * 2, ch - margin * 2);

    // 3. 绘制各分区
    for (const zone of zones) {
      // coding 和 showcase 共享同一物理区，按日期决定显示哪个
      if (zone.id === 'showcase' && currentDay !== '30-exhibit') continue;
      if (zone.id === 'coding' && currentDay === '30-exhibit') continue;

      const dayConf = zone.dayConfig[currentDay];
      const isSelected = zone.id === selectedZoneId;

      // 填充
      buildPath(ctx, zone.polygon, cw, ch);
      ctx.fillStyle = isSelected
        ? 'rgba(82, 196, 26, 0.25)'
        : zone.color;
      ctx.fill();

      // 热力叠加
      if (heatmapData && heatmapData[zone.id] != null && zone.category !== 'corridor') {
        buildPath(ctx, zone.polygon, cw, ch);
        ctx.fillStyle = heatColor(heatmapData[zone.id]);
        ctx.fill();
      }

      // 描边
      buildPath(ctx, zone.polygon, cw, ch);
      ctx.strokeStyle = isSelected ? '#52C41A' : '#BDBDBD';
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.stroke();

      // 通道斜线纹理
      if (zone.category === 'corridor') {
        ctx.save();
        buildPath(ctx, zone.polygon, cw, ch);
        ctx.clip();
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 0.5;
        const bounds = zone.polygon.reduce(
          (acc, p) => ({
            minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x),
            minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y),
          }),
          { minX: 100, maxX: 0, minY: 33, maxY: 0 }
        );
        for (let i = bounds.minX - 5; i < bounds.maxX + 5; i += 2) {
          const start = toCanvas({ x: i, y: bounds.minY }, cw, ch);
          const end = toCanvas({ x: i + 5, y: bounds.maxY }, cw, ch);
          ctx.beginPath();
          ctx.moveTo(start.cx, start.cy);
          ctx.lineTo(end.cx, end.cy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 标签
      if (showLabels && dayConf) {
        const { cx, cy } = toCanvas(zone.labelPosition, cw, ch);
        const fontSize = Math.max(9, Math.min(12, cw / 85));
        ctx.font = `${fontSize}px -apple-system, "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dayConf.accessible ? '#333' : '#999';
        ctx.fillText(dayConf.label, cx, cy, cw * 0.18);

        // 禁入标记
        if (!dayConf.accessible && zone.category !== 'corridor') {
          ctx.font = `${fontSize - 2}px sans-serif`;
          ctx.fillStyle = '#FF4D4F';
          ctx.fillText('禁入', cx, cy + fontSize + 2);
        }
      }
    }

    // 4. 页脚
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText('示意图 · 分区 2026-08-28 标注 / 平面 0816 出图 · 以现场导视为准', cw - 8, ch - 6);
  }, [zones, currentDay, selectedZoneId, heatmapData, showLabels]);

  // 点击检测
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      if (zone.category === 'corridor') continue;
      if (zone.id === 'showcase' && currentDay !== '30-exhibit') continue;
      if (zone.id === 'coding' && currentDay === '30-exhibit') continue;

      buildPath(ctx, zone.polygon, cw, ch);
      if (ctx.isPointInPath(mx, my)) {
        onSelectZone(zone.id === selectedZoneId ? null : zone.id);
        return;
      }
    }
    onSelectZone(null);
  }, [zones, currentDay, selectedZoneId, onSelectZone]);

  // 渲染 + resize
  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'block', width: '100%' }}
      />
    </div>
  );
}
