'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { ENTRANCES, type ExpoDataset, type Point } from '../lib/data';
import type { PlanStop } from '../lib/planner';

type Props = {
  dataset: ExpoDataset;
  stops: PlanStop[];
  entranceId: string;
  selectedId?: string;
  onSelect: (sourceId: string) => void;
};

export default function MapCanvas({ dataset,stops,entranceId,selectedId,onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ width:0,height:0,scaleX:1,scaleY:1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(320,Math.floor(rect.width));
      const height = Math.max(420,Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1,2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      stateRef.current = { width,height,scaleX:width/100,scaleY:height/100 };

      ctx.fillStyle = '#fbfbf8';
      ctx.fillRect(0,0,width,height);
      ctx.strokeStyle = '#ecece6';
      ctx.lineWidth = 1;
      for (let x=0;x<=100;x+=10) { ctx.beginPath(); ctx.moveTo(x*width/100,0); ctx.lineTo(x*width/100,height); ctx.stroke(); }
      for (let y=0;y<=100;y+=10) { ctx.beginPath(); ctx.moveTo(0,y*height/100); ctx.lineTo(width,y*height/100); ctx.stroke(); }

      ctx.strokeStyle = '#d9d9d1';
      ctx.lineWidth = Math.max(12,width*.02);
      ctx.lineCap = 'square';
      [[8,8,92,8],[8,33,92,33],[8,58,92,58],[8,83,92,83],[8,8,8,92],[38,8,38,92],[68,8,68,92],[92,8,92,92]].forEach(([x1,y1,x2,y2]) => { ctx.beginPath(); ctx.moveTo(x1*width/100,y1*height/100); ctx.lineTo(x2*width/100,y2*height/100); ctx.stroke(); });

      ctx.fillStyle = '#9a9a92';
      ctx.font = `600 ${Math.max(10,Math.min(13,width*.013))}px sans-serif`;
      ctx.textAlign = 'left';
      [['A 区',12,13],['B 区',42,38],['C 区',72,13],['D 区',72,63]].forEach(([label,x,y]) => ctx.fillText(String(label),Number(x)*width/100,Number(y)*height/100));

      const allPoints: Point[] = [ENTRANCES.find((item) => item.id === entranceId)?.position ?? ENTRANCES[0].position,...stops.map((stop) => stop.position)];
      if (allPoints.length > 1) {
        ctx.strokeStyle = '#111713';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash([7,6]);
        ctx.beginPath();
        allPoints.forEach((point,index) => index ? ctx.lineTo(point.x*width/100,point.y*height/100) : ctx.moveTo(point.x*width/100,point.y*height/100));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      dataset.exhibitors.forEach((exhibitor) => {
        const x = exhibitor.position.x*width/100;
        const y = exhibitor.position.y*height/100;
        const onRoute = stops.some((stop) => stop.sourceId === exhibitor.id);
        const selected = selectedId === exhibitor.id;
        const boxW = Math.max(44,width*.065);
        const boxH = 30;
        ctx.fillStyle = selected ? '#111713' : onRoute ? '#dfff62' : '#ffffff';
        ctx.strokeStyle = selected ? '#111713' : onRoute ? '#111713' : '#bdbdb5';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.fillRect(x-boxW/2,y-boxH/2,boxW,boxH);
        ctx.strokeRect(x-boxW/2,y-boxH/2,boxW,boxH);
        ctx.fillStyle = selected ? '#ffffff' : '#111713';
        ctx.font = `700 ${Math.max(9,Math.min(12,width*.012))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(exhibitor.booth,x,y);
      });

      const entrance = ENTRANCES.find((item) => item.id === entranceId) ?? ENTRANCES[0];
      const ex = entrance.position.x*width/100;
      const ey = entrance.position.y*height/100;
      ctx.beginPath(); ctx.fillStyle='#111713'; ctx.arc(ex,ey,11,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.arc(ex,ey,7,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#ffffff'; ctx.font='700 9px sans-serif'; ctx.textAlign='center'; ctx.fillText('起',ex,ey+.5);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  },[dataset,stops,entranceId,selectedId]);

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 100;
    const y = (event.clientY - rect.top) / rect.height * 100;
    const closest = dataset.exhibitors.map((exhibitor) => ({ exhibitor,dist:Math.hypot(exhibitor.position.x-x,exhibitor.position.y-y) })).sort((a,b) => a.dist-b.dist)[0];
    if (closest && closest.dist < 8) onSelect(closest.exhibitor.id);
  }

  return <canvas ref={canvasRef} className="venue-canvas" onClick={handleClick} aria-label="可交互场馆地图。点击展位查看详情。" />;
}
