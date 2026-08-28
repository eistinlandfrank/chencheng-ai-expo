'use client';

import { useState, useEffect } from 'react';
import { readSettings, writeSettings, type AdminSettings } from '../../shared/storage';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AdminSettings>(() => readSettings());

  const update = (patch: Partial<AdminSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeSettings(next);
  };

  return (
    <div className="ad-settings">
      <h2>系统设置</h2>

      <div className="ad-form-card">
        <div className="ad-form-row">
          <label>演示数据</label>
          <div>
            <input
              type="checkbox"
              checked={settings.demoMode}
              onChange={e => update({ demoMode: e.target.checked })}
            />
            <span className="ad-hint"> 开启后热力图、KPI、预警显示演示假数据</span>
          </div>
        </div>
      </div>

      <h3>平面图重构 API</h3>
      <div className="ad-form-card">
        <div className="ad-form-row">
          <label>API Key</label>
          <input
            type="password"
            value={settings.floorplanApiKey}
            onChange={e => update({ floorplanApiKey: e.target.value })}
            placeholder="留空则平面图重构显示「未配置」"
          />
        </div>
        <div className="ad-form-row">
          <label>Base URL</label>
          <input
            value={settings.floorplanBase}
            onChange={e => update({ floorplanBase: e.target.value })}
            placeholder="https://api.example.com"
          />
        </div>
        <div className="ad-form-row">
          <label>Model</label>
          <input
            value={settings.floorplanModel}
            onChange={e => update({ floorplanModel: e.target.value })}
            placeholder="模型名称"
          />
        </div>
      </div>
    </div>
  );
}
