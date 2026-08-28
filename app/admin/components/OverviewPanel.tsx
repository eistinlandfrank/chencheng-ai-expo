'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExpoDay, HeatmapData } from '../../shared/types';
import ZONES from '../../shared/zones';
import ZoneMapCanvas from '../../shared/zone-map-canvas';
import { readSettings } from '../../shared/storage';

/** mulberry32 伪随机数生成器 */
function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type Props = {
  currentDay: ExpoDay;
};

export default function OverviewPanel({ currentDay }: Props) {
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [displayHeatmap, setDisplayHeatmap] = useState<HeatmapData>({});
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const targetRef = useRef<HeatmapData>({});
  const animFrameRef = useRef<number>(0);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    setDemoMode(readSettings().demoMode);
  }, []);

  // 初始化热力数据
  useEffect(() => {
    if (!demoMode) return;

    const dateSeed = new Date().getDate() * 1000 + new Date().getMonth() * 100;
    const rng = mulberry32(dateSeed);

    const initial: HeatmapData = {};
    for (const zone of ZONES) {
      if (zone.category === 'corridor') continue;
      initial[zone.id] = rng() * 0.6 + 0.1;
    }
    setHeatmap(initial);
    setDisplayHeatmap(initial);
    targetRef.current = { ...initial };
  }, [demoMode]);

  // 随机游走更新 target
  useEffect(() => {
    if (!demoMode) return;

    const dateSeed = new Date().getDate() * 1000 + new Date().getMonth() * 100 + 7;
    const rng = mulberry32(dateSeed);
    let counter = 0;

    const interval = setInterval(() => {
      counter++;
      const newTarget: HeatmapData = {};
      for (const zone of ZONES) {
        if (zone.category === 'corridor') continue;
        const current = targetRef.current[zone.id] ?? 0.3;
        const delta = (rng() - 0.5) * 0.15;
        newTarget[zone.id] = Math.max(0.05, Math.min(0.95, current + delta));
      }
      targetRef.current = newTarget;
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
    }, 2500 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [demoMode]);

  // 缓动动画
  useEffect(() => {
    if (!demoMode) return;

    function animate() {
      setDisplayHeatmap(prev => {
        const next: HeatmapData = {};
        let changed = false;
        for (const key of Object.keys(targetRef.current)) {
          const target = targetRef.current[key];
          const current = prev[key] ?? target;
          const lerped = current + (target - current) * 0.04;
          next[key] = lerped;
          if (Math.abs(lerped - current) > 0.001) changed = true;
        }
        return changed ? next : prev;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    }
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [demoMode]);

  // 假指标
  const demoKpi = [
    { label: '今日访客', value: '8,642', change: '+12.5%', up: true },
    { label: '热门分区', value: 'Workshop', change: '当前最受欢迎', up: true },
    { label: '开放摊位', value: '6', change: '已录入', up: true },
    { label: '告警', value: '2', change: '通道拥堵', up: false },
  ];

  const topZones = Object.entries(displayHeatmap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, val]) => {
      const zone = ZONES.find(z => z.id === id);
      return { name: zone?.name ?? id, density: val };
    });

  return (
    <div className="ad-overview">
      {/* KPI 卡片 */}
      <div className="ad-kpi-row">
        {demoKpi.map(kpi => (
          <div key={kpi.label} className="ad-kpi-card">
            <div className="ad-kpi-label">{kpi.label}</div>
            <div className="ad-kpi-value">{kpi.value}</div>
            <div className={`ad-kpi-change ${kpi.up ? 'up' : 'down'}`}>{kpi.change}</div>
            <span className="ad-demo-badge">演示</span>
          </div>
        ))}
      </div>

      {/* 热力图 */}
      <div className="ad-heatmap-section">
        <div className="ad-section-header">
          <h2>展馆实时热力图</h2>
          <div className="ad-heatmap-legend">
            <span>访客密度：低</span>
            <div className="ad-legend-bar" />
            <span>高</span>
          </div>
          <span className="ad-demo-badge">演示数据</span>
        </div>
        {demoMode ? (
          <>
            <ZoneMapCanvas
              zones={ZONES}
              currentDay={currentDay}
              selectedZoneId={null}
              onSelectZone={() => {}}
              heatmapData={displayHeatmap}
            />
            <div className="ad-last-update">
              最后更新：{lastUpdate || '--:--:--'}
            </div>
          </>
        ) : (
          <div className="ad-no-data">未接入客流</div>
        )}
      </div>

      <div className="ad-bottom-row">
        {/* 热门分区榜 */}
        <div className="ad-rank-card">
          <h3>热门分区 TOP5 <span className="ad-demo-badge">演示</span></h3>
          <div className="ad-rank-list">
            {topZones.map((z, i) => (
              <div key={z.name} className="ad-rank-item">
                <span className={`ad-rank-num rank-${i + 1}`}>{i + 1}</span>
                <span className="ad-rank-name">{z.name}</span>
                <div className="ad-rank-bar">
                  <div className="ad-rank-fill" style={{ width: `${z.density * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 预警 */}
        <div className="ad-alert-card">
          <h3>实时通知与预警 <span className="ad-demo-badge">演示</span></h3>
          <div className="ad-alert-list">
            <div className="ad-alert-item alert-warning">
              <span className="ad-alert-icon">⚠</span>
              <div>
                <div className="ad-alert-title">通道拥堵</div>
                <div className="ad-alert-desc">主疏散通道密度偏高，请引导分流</div>
              </div>
              <span className="ad-alert-time">10:48</span>
            </div>
            <div className="ad-alert-item alert-info">
              <span className="ad-alert-icon">ℹ</span>
              <div>
                <div className="ad-alert-title">Workshop 即将开始</div>
                <div className="ad-alert-desc">下一场 Workshop 15 分钟后开始</div>
              </div>
              <span className="ad-alert-time">10:45</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
