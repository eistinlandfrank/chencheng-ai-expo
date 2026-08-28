'use client';

import { useState } from 'react';
import type { ExpoDay } from '../../shared/types';
import { ADMIN_DAY_OPTIONS } from '../../shared/constants';
import ZONES from '../../shared/zones';
import ZoneMapCanvas from '../../shared/zone-map-canvas';

type Props = {
  currentDay: ExpoDay;
  onDayChange: (day: ExpoDay) => void;
};

export default function AdminMapPanel({ currentDay, onDayChange }: Props) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const selectedZone = ZONES.find(z => z.id === selectedZoneId);
  const dayConf = selectedZone ? selectedZone.dayConfig[currentDay] : null;

  return (
    <div className="ad-map-panel">
      <div className="ad-day-switcher">
        {ADMIN_DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ad-day-btn ${currentDay === opt.value ? 'ad-day-active' : ''}`}
            onClick={() => onDayChange(opt.value as ExpoDay)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ZoneMapCanvas
        zones={ZONES}
        currentDay={currentDay}
        selectedZoneId={selectedZoneId}
        onSelectZone={setSelectedZoneId}
      />

      {selectedZone && dayConf && (
        <div className="ad-zone-info">
          <h3>{selectedZone.name}</h3>
          <p>当前日期显示：{dayConf.label}</p>
          <p>状态：{dayConf.accessible ? '开放' : '禁入'}</p>
          {dayConf.note && <p>备注：{dayConf.note}</p>}
          <p>观众可见：{selectedZone.audienceVisible ? '是' : '否'}</p>
          <p>分类：{selectedZone.category === 'corridor' ? '通道' : '功能区'}</p>
        </div>
      )}

      <div className="ad-map-footer">
        示意图 · 分区 2026-08-28 标注 / 平面 0816 出图 · 以现场导视为准
      </div>
    </div>
  );
}
