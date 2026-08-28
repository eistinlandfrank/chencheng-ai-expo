'use client';

import { useState } from 'react';
import type { ExpoDay } from '../../shared/types';
import { EXPO_TITLE } from '../../shared/constants';
import OverviewPanel from './OverviewPanel';
import AdminMapPanel from './AdminMapPanel';
import DataEntryPanel from './DataEntryPanel';
import FloorplanPanel from './FloorplanPanel';
import SettingsPanel from './SettingsPanel';

type Panel = 'overview' | 'map' | 'entry' | 'floorplan' | 'settings';

const NAV: { key: Panel; label: string; icon: string }[] = [
  { key: 'overview', label: '展会总览', icon: '📊' },
  { key: 'map', label: '展位地图', icon: '🗺' },
  { key: 'entry', label: '运营录入', icon: '📝' },
  { key: 'floorplan', label: '平面图重构', icon: '📐' },
  { key: 'settings', label: '系统设置', icon: '⚙' },
];

type Props = {
  activePanel: Panel;
  onPanelChange: (p: Panel) => void;
};

export default function AdminShell({ activePanel, onPanelChange }: Props) {
  const [currentDay, setCurrentDay] = useState<ExpoDay>('27-29');

  return (
    <div className="ad-shell">
      {/* 左栏 */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-brand">
          <span className="ad-logo">🤖</span>
          <div>
            <div className="ad-brand-name">Expo Service AI</div>
            <div className="ad-brand-sub">展会智能服务管理平台</div>
          </div>
        </div>
        <nav className="ad-nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`ad-nav-item ${activePanel === n.key ? 'ad-nav-active' : ''}`}
              onClick={() => onPanelChange(n.key)}
            >
              <span className="ad-nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-footer">
          <span className="ad-system-status">● 系统运行正常</span>
        </div>
      </aside>

      {/* 主区 */}
      <div className="ad-main">
        {/* 顶栏 */}
        <header className="ad-topbar">
          <h1 className="ad-page-title">{NAV.find(n => n.key === activePanel)?.label}</h1>
          <div className="ad-topbar-right">
            <span className="ad-expo-name">当前展会：{EXPO_TITLE}</span>
          </div>
        </header>

        {/* 内容 */}
        <main className="ad-content">
          {activePanel === 'overview' && <OverviewPanel currentDay={currentDay} />}
          {activePanel === 'map' && <AdminMapPanel currentDay={currentDay} onDayChange={setCurrentDay} />}
          {activePanel === 'entry' && <DataEntryPanel />}
          {activePanel === 'floorplan' && <FloorplanPanel />}
          {activePanel === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
