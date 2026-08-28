'use client';

import { useState } from 'react';
import type { ExpoDay } from '../../shared/types';
import ZONES from '../../shared/zones';
import ZoneMapCanvas from '../../shared/zone-map-canvas';
import ZoneMapTab from './ZoneMapTab';
import ScheduleTab from './ScheduleTab';
import NearbyTab from './NearbyTab';
import InfoTab from './InfoTab';

type Tab = 'map' | 'schedule' | 'nearby' | 'info';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'map', label: '展位地图', icon: '🗺' },
  { key: 'schedule', label: '行程', icon: '📅' },
  { key: 'nearby', label: '附近', icon: '📍' },
  { key: 'info', label: '须知', icon: '📋' },
];

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export default function AudienceShell({ activeTab, onTabChange }: Props) {
  const [currentDay, setCurrentDay] = useState<ExpoDay>('27-29');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const audienceZones = ZONES.filter(z =>
    z.audienceVisible || z.id === 'coding' || z.id === 'showcase' || z.id === 'opening'
  );

  return (
    <div className="au-shell">
      {/* 顶栏 */}
      <header className="au-topbar">
        <div className="au-topbar-brand">
          <span className="au-logo">🤖</span>
          <div>
            <div className="au-brand-name">Expo Service AI</div>
            <div className="au-brand-sub">您的智能逛展助手</div>
          </div>
        </div>
        <div className="au-topbar-title">展位服务</div>
      </header>

      {/* 内容区 */}
      <main className="au-content">
        {activeTab === 'map' && (
          <ZoneMapTab
            zones={audienceZones}
            currentDay={currentDay}
            onDayChange={setCurrentDay}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
          />
        )}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'nearby' && <NearbyTab />}
        {activeTab === 'info' && <InfoTab />}
      </main>

      {/* 底栏 Tab */}
      <nav className="au-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`au-tab ${activeTab === t.key ? 'au-tab-active' : ''}`}
            onClick={() => onTabChange(t.key)}
          >
            <span className="au-tab-icon">{t.icon}</span>
            <span className="au-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
