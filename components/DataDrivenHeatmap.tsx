'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Info, RefreshCw, ZoomIn } from 'lucide-react';
import { schematicGates, statusLabels, type ShowcaseBooth } from '@/lib/venue-showcase-data';

type DataDrivenHeatmapProps = {
  booths: ShowcaseBooth[];
  onSelect?: (booth: ShowcaseBooth) => void;
};

const COLS = ['A', 'B', 'C', 'D', 'E'] as const;

function hashPhase(id: string) {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = (value * 31 + id.charCodeAt(index)) % 360;
  return (value / 360) * Math.PI * 2;
}

function colorRamp(t: number): [number, number, number, number] {
  const stops: Array<[number, number, number, number, number]> = [
    [0, 59, 130, 246, 0],
    [0.18, 34, 211, 238, 90],
    [0.36, 74, 222, 128, 140],
    [0.55, 250, 204, 21, 170],
    [0.74, 251, 146, 60, 200],
    [0.9, 239, 68, 68, 230],
    [1, 185, 28, 28, 245],
  ];
  const clamped = Math.min(1, Math.max(0, t));
  let end = 1;
  while (end < stops.length && stops[end][0] < clamped) end += 1;
  const start = Math.max(0, end - 1);
  const a = stops[start];
  const b = stops[end] ?? a;
  const span = Math.max(0.0001, b[0] - a[0]);
  const u = (clamped - a[0]) / span;
  return [
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
    Math.round(a[3] + (b[3] - a[3]) * u),
    Math.round(a[4] + (b[4] - a[4]) * u),
  ];
}

export default function DataDrivenHeatmap({ booths, onSelect }: DataDrivenHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(true);
  const [hover, setHover] = useState<{ booth: ShowcaseBooth; x: number; y: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const maxHeat = useMemo(() => Math.max(...booths.map((booth) => booth.heatScore), 0.01), [booths]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const tick = () => setStamp(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    let raf = 0;
    const draw = (time: number) => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (width < 8 || height < 8) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const heatScale = 0.55;
      const hw = Math.max(1, Math.round(width * heatScale));
      const hh = Math.max(1, Math.round(height * heatScale));
      if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
      const off = offscreenRef.current;
      if (off.width !== hw) off.width = hw;
      if (off.height !== hh) off.height = hh;
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const octx = off.getContext('2d', { willReadFrequently: true });
      const ctx = canvas.getContext('2d');
      if (!octx || !ctx) return;
      octx.clearRect(0, 0, hw, hh);
      const scaleX = hw / width;
      const scaleY = hh / height;
      const frameBox = frame.getBoundingClientRect();
      const centers = new Map<string, { x: number; y: number }>();
      frame.querySelectorAll('[data-booth-id]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const id = node.dataset.boothId;
        if (!id) return;
        const box = node.getBoundingClientRect();
        centers.set(id, {
          x: (box.left + box.width / 2 - frameBox.left) * scaleX,
          y: (box.top + box.height / 2 - frameBox.top) * scaleY,
        });
      });

      for (const booth of booths) {
        const breath = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(time / 1100 + hashPhase(booth.id));
        const score = Math.min(1, (booth.heatScore / maxHeat) * breath * (booth.featured ? 1.18 : 1));
        if (score < 0.22) continue;
        const center = centers.get(booth.id);
        if (!center) continue;
        const radius = (18 + score * (booth.featured ? 72 : 54)) * (hw / 520);
        const gradient = octx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${0.4 + score * 0.6})`);
        gradient.addColorStop(0.42, `rgba(255,255,255,${0.16 + score * 0.32})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        octx.fillStyle = gradient;
        octx.beginPath();
        octx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        octx.fill();
      }

      const image = octx.getImageData(0, 0, hw, hh);
      const data = image.data;
      for (let index = 0; index < data.length; index += 4) {
        const intensity = data[index + 3] / 255;
        if (intensity <= 0.01) {
          data[index + 3] = 0;
          continue;
        }
        const [r, g, b, a] = colorRamp(Math.min(1, intensity * 1.15));
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = a;
      }
      octx.putImageData(image, 0, 0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, width, height);
      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [booths, maxHeat, reduceMotion]);

  function handleMove(event: MouseEvent<HTMLButtonElement>, booth: ShowcaseBooth) {
    const frame = frameRef.current;
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    setHover({ booth, x: event.clientX - box.left, y: event.clientY - box.top });
  }

  return (
    <section className="heat-card">
      <header className="heat-head">
        <div>
          <h2>展馆实时热力图</h2>
          <p><span className="heat-live"><i />实时</span> HeatScore 驱动 · {booths.length} 个点位</p>
        </div>
        {showLegend && (
          <div className="heat-legend" aria-hidden="true">
            <span>访客密度：低</span>
            <i />
            <span>高</span>
          </div>
        )}
      </header>

      <div className="heat-stage" style={{ transform: `scale(${zoom})` }}>
        <div className="heat-frame" ref={frameRef}>
          <canvas ref={canvasRef} className="heat-canvas" aria-hidden="true" />
          <span className="heat-spine" aria-hidden="true" />
          <div className="heat-col-labels">
            {COLS.map((col) => <span key={col}>{col}区</span>)}
          </div>
          <div className="heat-grid" role="list">
            {booths.map((booth) => (
              <button
                className={`heat-booth ${booth.featured ? 'featured' : ''} ${booth.companyName === '待布展' ? 'empty' : ''}`}
                key={booth.id}
                type="button"
                role="listitem"
                data-booth-id={booth.id}
                style={{ gridColumn: COLS.indexOf(booth.col) + 1, gridRow: booth.row }}
                onMouseEnter={(event) => handleMove(event, booth)}
                onMouseMove={(event) => handleMove(event, booth)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ booth, x: 80, y: 40 })}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(booth)}
                aria-label={`${booth.id} ${booth.companyName}，热度 ${(booth.heatScore * 100).toFixed(0)}`}
              >
                {booth.id}
              </button>
            ))}
          </div>
          <aside className="heat-facilities" aria-label="消防与服务设施">
            <div>消防栓/柱</div>
            <div>服务区</div>
          </aside>
          <nav className="heat-tools" aria-label="热力图控制">
            <button type="button" onClick={() => setZoom((value) => (value >= 1.24 ? 1 : Number((value + 0.12).toFixed(2))))} title="缩放">
              <ZoomIn size={15} /><span>缩放</span>
            </button>
            <button type="button" className={showLegend ? 'active' : ''} onClick={() => setShowLegend((value) => !value)} title="图例">
              <Info size={15} /><span>图例</span>
            </button>
            <button type="button" onClick={() => setStamp(new Date().toLocaleTimeString('zh-CN', { hour12: false }))} title="刷新">
              <RefreshCw size={15} /><span>刷新</span>
            </button>
          </nav>
          <footer className="heat-gates">
            {schematicGates.map((gate) => (
              <span key={gate.id}>
                <b />
                {gate.label}
              </span>
            ))}
          </footer>
          {hover && (
            <div className="heat-tip" style={{ left: Math.min(hover.x + 14, 280), top: Math.max(12, hover.y - 12) }}>
              <strong>{hover.booth.id} · {hover.booth.companyName}</strong>
              <p>{hover.booth.offers}</p>
              <ul>
                <li>赛道 {hover.booth.category}</li>
                <li>热度 {(hover.booth.heatScore * 100).toFixed(0)}</li>
                <li>驻留 {hover.booth.avgDwellMinutes} 分钟</li>
                <li>意向 {hover.booth.businessLeads}</li>
                <li>接待 {statusLabels[hover.booth.status]}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="heat-stamp">最后更新：{stamp ?? '--:--:--'}</div>
    </section>
  );
}
