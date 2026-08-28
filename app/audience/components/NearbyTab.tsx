'use client';

import { useState } from 'react';
import { readAdminData } from '../../shared/storage';
import ZONES from '../../shared/zones';

const CHIPS = ['全部', 'Workshop', '赞助商区', '野人先生', '拍照打卡', '医疗区', '用餐区'] as const;

export default function NearbyTab() {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<string>('全部');
  const data = readAdminData();

  // 预置分区级记录（观众可见的）
  const audienceZones = ZONES.filter(z => z.audienceVisible && z.category !== 'corridor');

  // 合并主办录入的摊位
  const boothsByZone = new Map<string, typeof data.booths>();
  for (const b of data.booths.filter(b => b.audienceAllowed)) {
    const list = boothsByZone.get(b.zoneId) || [];
    list.push(b);
    boothsByZone.set(b.zoneId, list);
  }

  // 过滤
  const filtered = audienceZones.filter(z => {
    if (chip !== '全部' && z.name !== chip) return false;
    if (search && !z.name.includes(search)) return false;
    return true;
  });

  // POI
  const pois = data.pois.filter(p => p.audienceAllowed);
  const filteredPois = pois.filter(p => {
    if (search && !p.name.includes(search)) return false;
    return true;
  });

  return (
    <div className="au-nearby">
      <div className="au-search-bar">
        <input
          type="text"
          placeholder="搜索分区或服务"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="au-search-input"
        />
      </div>

      <div className="au-chips">
        {CHIPS.map(c => (
          <button
            key={c}
            className={`au-chip ${chip === c ? 'au-chip-active' : ''}`}
            onClick={() => setChip(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="au-nearby-list">
        {filtered.map(zone => {
          const zoneBooth = boothsByZone.get(zone.id) || [];
          return (
            <div key={zone.id} className="au-nearby-card">
              <div className="au-nearby-card-header">
                <span className="au-nearby-dot" style={{ background: zone.color }} />
                <span className="au-nearby-name">{zone.name}</span>
              </div>
              {zoneBooth.length > 0 ? (
                <div className="au-nearby-booths">
                  {zoneBooth.map(b => (
                    <div key={b.boothId} className="au-nearby-booth">
                      <span>{b.name || '（未命名）'}</span>
                      <span className={`au-booth-badge au-badge-${b.status}`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="au-nearby-empty">暂无详细信息</div>
              )}
            </div>
          );
        })}

        {filteredPois.map(poi => (
          <div key={poi.id} className="au-nearby-card">
            <div className="au-nearby-card-header">
              <span className="au-nearby-dot" style={{ background: '#E0E0E0' }} />
              <span className="au-nearby-name">{poi.name}</span>
              <span className="au-nearby-kind">{poi.kind}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && filteredPois.length === 0 && (
          <div className="au-nearby-none">没有找到匹配结果</div>
        )}
      </div>
    </div>
  );
}
