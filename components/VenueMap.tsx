'use client';

import {
  BriefcaseBusiness,
  Cross,
  Cpu,
  Luggage,
  MapPin,
  Utensils,
} from 'lucide-react';
import type { RouteResult } from '@/lib/venue';
import { venue } from '@/lib/venue';

type VenueMapProps = {
  route?: RouteResult | null;
  selectedPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
  closedGroups?: Array<'north-main' | 'south-main'>;
  showEditorGrid?: boolean;
  visibleLayer?: 'all' | 'base' | 'zones' | 'routes' | 'anchors';
  routesEnabled?: boolean;
  className?: string;
};

const zones = [
  { id: 'workshop', label: '预留区域', detail: '用途待现场确认', x: .5, y: 2, w: 25.8, h: 95, tone: 'reserve' },
  { id: 'sponsor', label: '赞助商区', detail: '合作伙伴展示', x: 39.95, y: 0, w: 11.46, h: 72.96, tone: 'sponsor' },
  { id: 'coding', label: '项目开发 / 展示区', detail: '按活动日期转换', x: 51.41, y: .5, w: 28.85, h: 98, tone: 'coding' },
  { id: 'ceremony-rest', label: '开闭幕式 / 休息区', detail: '日期时变区域', x: 82.14, y: 11, w: 12.39, h: 74.4, tone: 'rest' },
];

const pois = [
  { id: 'south-gate', label: '图下入口', x: 32.65, y: 94, icon: MapPin },
  { id: 'luggage', label: '行李寄存', x: 27.4, y: 78, icon: Luggage },
  { id: 'dining', label: '用餐区', x: 30.9, y: 80, icon: Utensils },
  { id: 'checkin', label: '签到区', x: 37.2, y: 88, icon: BriefcaseBusiness },
  { id: 'medical', label: '医疗区', x: 41, y: 86, icon: Cross },
  { id: 'hardware-pickup', label: '硬件领取', x: 45.4, y: 86, icon: Cpu },
];

const gates = [
  { label: '图纸标记 15', x: 14.08 },
  { label: '图纸标记 14', x: 35.23 },
  { label: '图纸标记 13', x: 61.6 },
  { label: '图纸标记 12', x: 82.9 },
];

const accessPoints = [
  { label: '入口', x: 32.82, y: 0, type: 'entry' },
  { label: '出口', x: 59.47, y: 0, type: 'exit' },
  { label: '出口', x: 64.5, y: 0, type: 'exit' },
  { label: '入口', x: 32.65, y: 100, type: 'entry' },
  { label: '出口', x: 54.38, y: 100, type: 'exit' },
  { label: '出口', x: 59.62, y: 100, type: 'exit' },
  { label: '出口', x: 75.54, y: 100, type: 'exit' },
  { label: '出口', x: 80.81, y: 100, type: 'exit' },
];

const pillars = [
  { x: 31.33, y: 43.8 },
  { x: 41.91, y: 39.7 },
  { x: 62.9, y: 29.5 },
  { x: 73.66, y: 23.3 },
  { x: 84.24, y: 16.6 },
  { x: 94.82, y: 9.1 },
];

export default function VenueMap({
  route,
  selectedPlaceId,
  onSelectPlace,
  closedGroups = [],
  showEditorGrid = false,
  visibleLayer = 'all',
  routesEnabled = true,
  className = '',
}: VenueMapProps) {
  const shows = (layer: Exclude<VenueMapProps['visibleLayer'], undefined>) => visibleLayer === 'all' || visibleLayer === layer;
  const showRoutes = routesEnabled && shows('routes');
  const routePoints = showRoutes ? route?.polyline
    .map((point) => `${(point.x / venue.widthMeters) * 100},${100 - (point.y / venue.heightMeters) * 100}`)
    .join(' ') : undefined;

  return (
    <div
      className={`venue-map ${showEditorGrid ? 'editor-grid' : ''} ${className}`}
      role="region"
      aria-label="千人黑客松主会场导览图"
    >
      <div className="map-title-row">
        <div>
          <span className="map-level">主会场</span>
          <strong>场馆导览图</strong>
        </div>
      </div>

      <div className="hall-canvas">
        {showRoutes && <><div className={`main-corridor north ${closedGroups.includes('north-main') ? 'closed' : ''}`}>
          <span>{closedGroups.includes('north-main') ? '上侧主疏散通道临时关闭' : '上侧主疏散通道'}</span>
        </div>
        <div className={`main-corridor south ${closedGroups.includes('south-main') ? 'closed' : ''}`}>
          <span>{closedGroups.includes('south-main') ? '下侧主疏散通道临时关闭' : '下侧主疏散通道'}</span>
        </div></>}

        {shows('anchors') && gates.map((gate) => (
          <span className="gate-label" key={gate.label} style={{ left: `${gate.x}%` }}>{gate.label}</span>
        ))}

        {shows('anchors') && accessPoints.map((point, index) => (
          <span className={`access-point ${point.type}`} key={`${point.label}-${index}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>{point.label}</span>
        ))}

        {shows('base') && pillars.map((pillar, index) => <span className="map-pillar" key={index} style={{ left: `${pillar.x}%`, top: `${pillar.y}%` }} aria-hidden="true" />)}

        {shows('zones') && zones.map((zone) => {
          const zoneClassName = `map-zone tone-${zone.tone} ${selectedPlaceId === zone.id ? 'selected' : ''}`;
          const zoneStyle = { left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` };
          const zoneContent = <><strong>{zone.label}</strong><span>{zone.detail}</span></>;

          return onSelectPlace ? (
            <button
              className={zoneClassName}
              key={zone.id}
              style={zoneStyle}
              type="button"
              onClick={() => onSelectPlace(zone.id)}
              aria-label={`${zone.label}，${zone.detail}`}
            >
              {zoneContent}
            </button>
          ) : (
            <div className={zoneClassName} key={zone.id} style={zoneStyle}>
              {zoneContent}
            </div>
          );
        })}

        {shows('anchors') && pois.map(({ id, label, x, y, icon: Icon }) => {
          const poiClassName = `map-poi ${selectedPlaceId === id ? 'selected' : ''}`;
          const poiStyle = { left: `${x}%`, top: `${y}%` };
          const poiContent = <><Icon size={13} aria-hidden="true" /><span>{label}</span></>;

          return onSelectPlace ? (
            <button
              className={poiClassName}
              key={id}
              style={poiStyle}
              type="button"
              onClick={() => onSelectPlace(id)}
              aria-label={label}
            >
              {poiContent}
            </button>
          ) : (
            <div className={poiClassName} key={id} style={poiStyle}>
              {poiContent}
            </div>
          );
        })}

        {showRoutes && routePoints && (
          <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline className="route-halo" points={routePoints} />
            <polyline className="route-path" points={routePoints} />
          </svg>
        )}

        {showRoutes && route && route.polyline.length > 1 && (
          <>
            <span
              className="route-marker start"
              style={{ left: `${(route.polyline[0].x / venue.widthMeters) * 100}%`, top: `${100 - (route.polyline[0].y / venue.heightMeters) * 100}%` }}
            >起</span>
            <span
              className="route-marker target"
              style={{ left: `${(route.polyline.at(-1)!.x / venue.widthMeters) * 100}%`, top: `${100 - (route.polyline.at(-1)!.y / venue.heightMeters) * 100}%` }}
            >终</span>
          </>
        )}

      </div>
    </div>
  );
}
