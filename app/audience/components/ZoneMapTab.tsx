'use client';

import type { ExpoDay, Zone } from '../../shared/types';
import { DAY_OPTIONS } from '../../shared/constants';
import ZoneMapCanvas from '../../shared/zone-map-canvas';
import { readAdminData } from '../../shared/storage';

type Props = {
  zones: Zone[];
  currentDay: ExpoDay;
  onDayChange: (day: ExpoDay) => void;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
};

export default function ZoneMapTab({ zones, currentDay, onDayChange, selectedZoneId, onSelectZone }: Props) {
  const adminData = readAdminData();
  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const dayConf = selectedZone ? selectedZone.dayConfig[currentDay] : null;
  const booths = adminData.booths.filter(b => b.zoneId === selectedZoneId && b.audienceAllowed);

  return (
    <div className="au-map-tab">
      {/* 日期切换 */}
      <div className="au-day-switcher">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`au-day-btn ${currentDay === opt.value ? 'au-day-active' : ''}`}
            onClick={() => onDayChange(opt.value as ExpoDay)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 地图 */}
      <ZoneMapCanvas
        zones={zones}
        currentDay={currentDay}
        selectedZoneId={selectedZoneId}
        onSelectZone={onSelectZone}
      />

      {/* 分区详情弹层 */}
      {selectedZone && dayConf && (
        <div className="au-zone-detail">
          <div className="au-zone-detail-header">
            <h3>{dayConf.label}</h3>
            <button className="au-close-btn" onClick={() => onSelectZone(null)}>✕</button>
          </div>
          <div className="au-zone-detail-body">
            <p className={`au-zone-access ${dayConf.accessible ? 'accessible' : 'restricted'}`}>
              {dayConf.accessible ? '可进入' : '禁止进入'}
            </p>
            {dayConf.note && <p className="au-zone-note">{dayConf.note}</p>}

            {booths.length > 0 ? (
              <div className="au-booth-list">
                <h4>该区摊位</h4>
                {booths.map(b => (
                  <div key={b.boothId} className="au-booth-card">
                    <div className="au-booth-name">{b.name || '（未命名）'}</div>
                    <div className="au-booth-status">{b.status}</div>
                    {b.todayHours && <div className="au-booth-hours">{b.todayHours}</div>}
                    {b.summary && <p className="au-booth-summary">{b.summary}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="au-zone-empty">暂无摊位信息</p>
            )}

            <button className="au-map-btn" onClick={() => onSelectZone(null)}>
              在地图上查看该区
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
