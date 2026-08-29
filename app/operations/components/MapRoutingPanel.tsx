'use client';

import { useMemo, useState } from 'react';
import { Navigation, Route, ShieldCheck, Waypoints } from 'lucide-react';
import VenueMap from '@/components/VenueMap';
import { findRoute, venue, type RouteResult } from '@/lib/venue';
import { cadDoors, featuredBooths, getBooth, schematicGates } from '@/lib/venue-showcase-data';
import type { ClosedGroup } from '@/lib/state-types';

export default function MapRoutingPanel({ closedGroups, onCorridor }: { closedGroups: ClosedGroup[]; onCorridor?: () => void }) {
  const [fromId, setFromId] = useState('gate-south');
  const [toBooth, setToBooth] = useState('T-E05');
  const [wheelchair, setWheelchair] = useState(false);
  const target = getBooth(toBooth) ?? featuredBooths[0];

  const shown = useMemo<RouteResult | null>(() => {
    if (!target) return null;
    return findRoute(fromId, target.nodeId, { wheelchair, closedEdgeIds: edgeIdsFor(closedGroups) });
  }, [closedGroups, fromId, target, wheelchair]);

  return (
    <section className="route-sim">
      <header className="route-sim-head">
        <div>
          <span>0816 场地规划 · CAD 通口</span>
          <h2>场馆精细化路网与动线导视</h2>
          <p>示意图 1–5 号门对照真实门号。通道关闭后自动避开该路段。</p>
        </div>
        <div className="route-controls">
          <label>
            <span>起点</span>
            <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
              {schematicGates.map((gate) => (
                <option key={gate.id} value={gate.nodeId}>{gate.label} · {gate.cad}</option>
              ))}
            </select>
          </label>
          <label>
            <span>目标展位</span>
            <select value={toBooth} onChange={(event) => setToBooth(event.target.value)}>
              {featuredBooths.map((booth) => (
                <option key={booth.id} value={booth.id}>{booth.id} {booth.companyName}</option>
              ))}
            </select>
          </label>
          <label className="route-check">
            <input type="checkbox" checked={wheelchair} onChange={(event) => setWheelchair(event.target.checked)} />
            无障碍优先
          </label>
          {onCorridor && (
            <button className="route-corridor-btn" type="button" onClick={onCorridor}>
              <Waypoints size={16} />通道状态{closedGroups.length ? ` · ${closedGroups.length} 关闭` : ''}
            </button>
          )}
        </div>
      </header>
      <div className="route-sim-grid">
        <VenueMap closedGroups={closedGroups} route={shown} routesEnabled />
        <aside>
          <article>
            <Navigation size={18} />
            <div>
              <small>规划结果</small>
              <strong>{shown ? `${shown.distanceMeters} 米 · 约 ${shown.durationMinutes} 分钟` : '暂无可达路线'}</strong>
              <p>{shown?.instructions[0] ?? '请调整起点或恢复通道。'}</p>
            </div>
          </article>
          <ul className="cad-door-list">
            {cadDoors.map((door) => (
              <li key={door.id}>
                <Route size={14} />
                <span>
                  <strong>{door.label}</strong>
                  <small>{door.role}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="cad-note">
            <ShieldCheck size={14} />
            大厅 {venue.widthMeters} × {venue.heightMeters} m · 比例约 3:1 · 页脚以现场导视为准
          </p>
        </aside>
      </div>
    </section>
  );
}

function edgeIdsFor(closedGroups: ClosedGroup[]) {
  const ids: string[] = [];
  if (closedGroups.includes('north-main')) ids.push('n-01', 'n-02', 'n-03', 'n-04', 'n-05', 'n-06', 'n-07', 'n-08');
  if (closedGroups.includes('south-main')) ids.push('s-01', 's-02', 's-03', 's-04', 's-05', 's-06', 's-07', 's-08');
  return ids;
}
