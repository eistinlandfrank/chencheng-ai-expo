/** 百分比坐标点 (x: 0-100, y: 0-33) */
export type Point = { x: number; y: number };

/** 多边形顶点数组 */
export type Polygon = Point[];

/** 展会日期状态 */
export type ExpoDay = '26' | '27-29' | '30-exhibit' | '30-closing';

/** 分区日期配置 */
export type DayConfig = {
  label: string;
  accessible: boolean;
  note?: string;
};

/** 分区定义 */
export type Zone = {
  id: string;
  name: string;
  polygon: Polygon;
  color: string;
  labelPosition: Point;
  audienceVisible: boolean;
  category?: 'zone' | 'corridor';
  dayConfig: Record<ExpoDay, DayConfig>;
};

/** 摊位/展商 */
export type Booth = {
  boothId: string;
  zoneId: string;
  name: string;
  status: 'open' | 'busy' | 'break' | 'closed' | 'unknown';
  todayHours: string;
  summary: string;
  offers: string[];
  interaction: string;
  audienceAllowed: boolean;
  photoUrl: string | null;
  updatedAt: string;
  updatedBy: string;
};

/** 公开日程 */
export type ScheduleItem = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  zoneId?: string;
  audience: boolean;
};

/** 额外 POI */
export type NearbyPoi = {
  id: string;
  name: string;
  kind: 'toilet' | 'cafe' | 'charge' | 'desk' | 'other';
  zoneId?: string;
  audienceAllowed: boolean;
};

/** 外链 */
export type ExternalLink = {
  id: string;
  title: string;
  url: string;
  category: string;
};

/** 分区覆盖 */
export type ZoneOverride = {
  zoneId: string;
  audienceVisible?: boolean;
  todayHours?: string;
  note?: string;
};

/** 主办端管理的完整数据集 */
export type AdminDataset = {
  booths: Booth[];
  schedule: ScheduleItem[];
  pois: NearbyPoi[];
  links: ExternalLink[];
  zoneOverrides: ZoneOverride[];
  lastModified: string;
};

/** 热力图数据 */
export type HeatmapData = Record<string, number>;
