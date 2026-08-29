export type PlaceKind = 'zone' | 'service' | 'gate';

export type VenuePlace = {
  id: string;
  code: string;
  name: string;
  kind: PlaceKind;
  category: string;
  zone: string;
  nodeId: string;
  summary: string;
  tags: string[];
  accessible: boolean;
  status: 'open' | 'scheduled' | 'closed';
  statusLabel: string;
  dwellMinutes?: number;
  schedule?: string;
};

export type VenueNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'gate' | 'corridor' | 'poi' | 'zone';
};

export type VenueEdge = {
  id: string;
  from: string;
  to: string;
  distanceMeters: number;
  accessible: boolean;
  group: 'north-main' | 'south-main' | 'connector' | 'access';
};

export type RouteResult = {
  nodeIds: string[];
  edgeIds: string[];
  distanceMeters: number;
  durationMinutes: number;
  polyline: Array<{ x: number; y: number }>;
  instructions: string[];
};

export const venue = {
  id: 'venue-thousand-hackathon-main-hall',
  eventId: 'event-thousand-hackathon-2026',
  name: '千人黑客松主会场',
  floor: '主会场',
  widthMeters: 226.8,
  heightMeters: 33.2,
  timezone: 'Asia/Shanghai',
  mapVersion: '0816-1',
  mapStatus: 'review' as const,
  accessibilityVerified: false,
  source: '0816 场地规划 + 0814 CAD 毫米坐标',
};

export const nodes: VenueNode[] = [
  { id: 'south-west', x: 10, y: 12.25, label: '图下主通道左端', type: 'corridor' },
  { id: 'south-15', x: 31.93, y: 12.25, label: '图纸标记 15 附近图下通道', type: 'corridor' },
  { id: 'south-dining', x: 48, y: 12.25, label: '用餐区通道', type: 'corridor' },
  { id: 'south-entry', x: 74.06, y: 12.25, label: '图下入口通道', type: 'corridor' },
  { id: 'south-sponsor', x: 103, y: 12.25, label: '赞助商区图下通道', type: 'corridor' },
  { id: 'south-dev', x: 139.72, y: 12.25, label: '开发区图下通道', type: 'corridor' },
  { id: 'south-robot', x: 160, y: 12.25, label: '硬件机器人区通道', type: 'corridor' },
  { id: 'south-12', x: 188.01, y: 12.25, label: '图纸标记 12 附近图下通道', type: 'corridor' },
  { id: 'south-east', x: 214.39, y: 12.25, label: '图右转换区通道', type: 'corridor' },
  { id: 'north-west', x: 10, y: 25.82, label: '图上主通道左端', type: 'corridor' },
  { id: 'north-15', x: 31.93, y: 25.82, label: '图纸标记 15 附近图上通道', type: 'corridor' },
  { id: 'north-dining', x: 48, y: 25.82, label: '后勤区图上通道', type: 'corridor' },
  { id: 'north-14', x: 79.89, y: 25.82, label: '图纸标记 14 附近图上通道', type: 'corridor' },
  { id: 'north-sponsor', x: 103, y: 25.82, label: '赞助商区图上通道', type: 'corridor' },
  { id: 'north-13', x: 139.72, y: 25.82, label: '图纸标记 13 附近图上通道', type: 'corridor' },
  { id: 'north-robot', x: 160, y: 25.82, label: '开发区图上通道', type: 'corridor' },
  { id: 'north-12', x: 188.01, y: 25.82, label: '图纸标记 12 附近图上通道', type: 'corridor' },
  { id: 'north-east', x: 214.39, y: 25.82, label: '图右转换区图上通道', type: 'corridor' },
  { id: 'gate-south', x: 74.06, y: 0, label: '图下入口', type: 'gate' },
  { id: 'gate-upper', x: 74.44, y: 33.2, label: '图上入口', type: 'gate' },
  { id: 'exit-upper-1', x: 134.89, y: 33.2, label: '图上左侧出口', type: 'gate' },
  { id: 'exit-upper-2', x: 146.29, y: 33.2, label: '图上右侧出口', type: 'gate' },
  { id: 'exit-lower-1', x: 123.33, y: 0, label: '图下最左侧出口', type: 'gate' },
  { id: 'exit-lower-2', x: 135.21, y: 0, label: '图下左中出口', type: 'gate' },
  { id: 'exit-lower-3', x: 171.32, y: 0, label: '图下右中出口', type: 'gate' },
  { id: 'exit-lower-4', x: 183.28, y: 0, label: '图下最右侧出口', type: 'gate' },
  { id: 'poi-luggage', x: 62.14, y: 6, label: '行李寄存', type: 'poi' },
  { id: 'poi-dining', x: 70.2, y: 6, label: '用餐区', type: 'poi' },
  { id: 'poi-checkin', x: 84.36, y: 3, label: '签到区', type: 'poi' },
  { id: 'poi-medical', x: 93.05, y: 3.43, label: '医疗区', type: 'poi' },
  { id: 'poi-hardware', x: 103, y: 4, label: '硬件领取', type: 'poi' },
  { id: 'zone-workshop', x: 66.35, y: 29, label: '活动预留区', type: 'zone' },
  { id: 'zone-sponsor', x: 103, y: 25.82, label: '赞助商区', type: 'zone' },
  { id: 'zone-3d', x: 128, y: 29, label: '3D 打印区', type: 'zone' },
  { id: 'zone-coding', x: 149, y: 20, label: '项目开发区', type: 'zone' },
  { id: 'zone-robot', x: 160, y: 6, label: '硬件机器人开发区', type: 'zone' },
  { id: 'zone-rest', x: 201, y: 20, label: '开闭幕式 / 休息区', type: 'zone' },
];

export const edges: VenueEdge[] = [
  { id: 's-01', from: 'south-west', to: 'south-15', distanceMeters: 21.93, accessible: true, group: 'south-main' },
  { id: 's-02', from: 'south-15', to: 'south-dining', distanceMeters: 16.07, accessible: true, group: 'south-main' },
  { id: 's-03', from: 'south-dining', to: 'south-entry', distanceMeters: 26.06, accessible: true, group: 'south-main' },
  { id: 's-04', from: 'south-entry', to: 'south-sponsor', distanceMeters: 28.94, accessible: true, group: 'south-main' },
  { id: 's-05', from: 'south-sponsor', to: 'south-dev', distanceMeters: 36.72, accessible: true, group: 'south-main' },
  { id: 's-06', from: 'south-dev', to: 'south-robot', distanceMeters: 20.28, accessible: true, group: 'south-main' },
  { id: 's-07', from: 'south-robot', to: 'south-12', distanceMeters: 28.01, accessible: true, group: 'south-main' },
  { id: 's-08', from: 'south-12', to: 'south-east', distanceMeters: 26.38, accessible: true, group: 'south-main' },
  { id: 'n-01', from: 'north-west', to: 'north-15', distanceMeters: 21.93, accessible: true, group: 'north-main' },
  { id: 'n-02', from: 'north-15', to: 'north-dining', distanceMeters: 16.07, accessible: true, group: 'north-main' },
  { id: 'n-03', from: 'north-dining', to: 'north-14', distanceMeters: 31.89, accessible: true, group: 'north-main' },
  { id: 'n-04', from: 'north-14', to: 'north-sponsor', distanceMeters: 23.11, accessible: true, group: 'north-main' },
  { id: 'n-05', from: 'north-sponsor', to: 'north-13', distanceMeters: 36.72, accessible: true, group: 'north-main' },
  { id: 'n-06', from: 'north-13', to: 'north-robot', distanceMeters: 20.28, accessible: true, group: 'north-main' },
  { id: 'n-07', from: 'north-robot', to: 'north-12', distanceMeters: 28.01, accessible: true, group: 'north-main' },
  { id: 'n-08', from: 'north-12', to: 'north-east', distanceMeters: 26.38, accessible: true, group: 'north-main' },
  { id: 'v-15', from: 'south-15', to: 'north-15', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-dining', from: 'south-dining', to: 'north-dining', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-entry', from: 'south-entry', to: 'north-14', distanceMeters: 14.76, accessible: true, group: 'connector' },
  { id: 'v-sponsor', from: 'south-sponsor', to: 'north-sponsor', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-dev', from: 'south-dev', to: 'north-13', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-robot', from: 'south-robot', to: 'north-robot', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-12', from: 'south-12', to: 'north-12', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'v-east', from: 'south-east', to: 'north-east', distanceMeters: 13.57, accessible: true, group: 'connector' },
  { id: 'a-south', from: 'gate-south', to: 'south-entry', distanceMeters: 12.25, accessible: true, group: 'access' },
  { id: 'a-upper-entry', from: 'gate-upper', to: 'north-14', distanceMeters: 9.18, accessible: true, group: 'access' },
  { id: 'a-upper-exit-1', from: 'exit-upper-1', to: 'north-13', distanceMeters: 8.82, accessible: true, group: 'access' },
  { id: 'a-upper-exit-2', from: 'exit-upper-2', to: 'north-13', distanceMeters: 9.88, accessible: true, group: 'access' },
  { id: 'a-lower-exit-1', from: 'exit-lower-1', to: 'south-dev', distanceMeters: 20.46, accessible: true, group: 'access' },
  { id: 'a-lower-exit-2', from: 'exit-lower-2', to: 'south-dev', distanceMeters: 13.05, accessible: true, group: 'access' },
  { id: 'a-lower-exit-3', from: 'exit-lower-3', to: 'south-robot', distanceMeters: 12.93, accessible: true, group: 'access' },
  { id: 'a-lower-exit-4', from: 'exit-lower-4', to: 'south-12', distanceMeters: 7.96, accessible: true, group: 'access' },
  { id: 'a-luggage', from: 'poi-luggage', to: 'south-dining', distanceMeters: 15.46, accessible: true, group: 'access' },
  { id: 'a-dining', from: 'poi-dining', to: 'south-entry', distanceMeters: 7.35, accessible: true, group: 'access' },
  { id: 'a-checkin', from: 'poi-checkin', to: 'south-entry', distanceMeters: 13.93, accessible: true, group: 'access' },
  { id: 'a-medical', from: 'poi-medical', to: 'south-sponsor', distanceMeters: 13.29, accessible: true, group: 'access' },
  { id: 'a-hardware', from: 'poi-hardware', to: 'south-sponsor', distanceMeters: 8.25, accessible: true, group: 'access' },
  { id: 'a-workshop', from: 'zone-workshop', to: 'north-14', distanceMeters: 14.03, accessible: true, group: 'access' },
  { id: 'a-sponsor', from: 'zone-sponsor', to: 'north-sponsor', distanceMeters: 1, accessible: true, group: 'access' },
  { id: 'a-3d', from: 'zone-3d', to: 'north-13', distanceMeters: 12.15, accessible: true, group: 'access' },
  { id: 'a-coding-n', from: 'zone-coding', to: 'north-robot', distanceMeters: 12.83, accessible: true, group: 'access' },
  { id: 'a-coding-s', from: 'zone-coding', to: 'south-dev', distanceMeters: 12.07, accessible: true, group: 'access' },
  { id: 'a-robot', from: 'zone-robot', to: 'south-robot', distanceMeters: 6.25, accessible: true, group: 'access' },
  { id: 'a-rest-n', from: 'zone-rest', to: 'north-12', distanceMeters: 14.22, accessible: true, group: 'access' },
  { id: 'a-rest-s', from: 'zone-rest', to: 'south-east', distanceMeters: 15.47, accessible: true, group: 'access' },
];

export const places: VenuePlace[] = [
  { id: 'robot-dev', code: '硬件机器人开发区', name: '硬件机器人开发区', kind: 'zone', category: '硬件', zone: '项目开发区', nodeId: 'zone-robot', summary: '专线网络支持的硬件与机器人协作开发区域。', tags: ['机器人', '硬件', '专线网络'], accessible: true, status: 'scheduled', statusLabel: '状态待确认', dwellMinutes: 25 },
  { id: 'coding', code: '项目开发区', name: '项目开发区（Coding）', kind: 'zone', category: '软件', zone: '项目开发区', nodeId: 'zone-coding', summary: '26–29 日项目开发，30 日转换为项目展示区。', tags: ['Coding', '软件', '项目展示'], accessible: true, status: 'scheduled', statusLabel: '状态待确认', dwellMinutes: 25 },
  { id: '3d-print', code: '3D 打印区', name: '3D 打印区', kind: 'zone', category: '硬件服务', zone: '项目开发区', nodeId: 'zone-3d', summary: '项目打样与 3D 打印支持区域。', tags: ['3D打印', '打样'], accessible: true, status: 'scheduled', statusLabel: '状态待确认', dwellMinutes: 15 },
  { id: 'sponsor', code: '赞助商区', name: '赞助商区', kind: 'zone', category: '合作伙伴', zone: '赞助商区', nodeId: 'zone-sponsor', summary: '赛事赞助商展示与服务区域。', tags: ['赞助商', '合作伙伴'], accessible: true, status: 'scheduled', statusLabel: '状态待确认', dwellMinutes: 15 },
  { id: 'workshop', code: '活动预留区', name: '活动预留区', kind: 'zone', category: '活动', zone: '图左活动区', nodeId: 'zone-workshop', summary: '现场活动预留区域，具体安排以当日公告为准。', tags: ['活动', '预留区'], accessible: true, status: 'scheduled', statusLabel: '安排待确认', dwellMinutes: 30 },
  { id: 'ceremony-rest', code: '图右时变区域', name: '开闭幕式 / 休息区', kind: 'zone', category: '活动与休息', zone: '图右转换区', nodeId: 'zone-rest', summary: '该区域会随活动日期转换用途，开放时间以主办方通知为准。', tags: ['开幕式', '休息', '闭幕式'], accessible: true, status: 'scheduled', statusLabel: '按日程使用', dwellMinutes: 20 },
  { id: 'dining', code: '用餐区', name: '用餐区', kind: 'service', category: '餐饮', zone: '图左服务区', nodeId: 'poi-dining', summary: '场馆用餐服务区域。', tags: ['餐饮', '用餐'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'medical', code: '医疗区', name: '医疗区', kind: 'service', category: '医疗', zone: '图左服务区', nodeId: 'poi-medical', summary: '现场基础医疗与应急协助。', tags: ['医疗', '急救'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'hardware-pickup', code: '硬件领取', name: '硬件领取', kind: 'service', category: '物料', zone: '图左服务区', nodeId: 'poi-hardware', summary: '参赛硬件与相关物料领取点。', tags: ['硬件', '物料领取'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'checkin', code: '签到区', name: '签到区', kind: 'service', category: '签到', zone: '图左服务区', nodeId: 'poi-checkin', summary: '参赛人员签到与现场咨询。', tags: ['签到', '咨询'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'luggage', code: '行李寄存', name: '行李寄存', kind: 'service', category: '寄存', zone: '图左服务区', nodeId: 'poi-luggage', summary: '行李寄存与领取服务点。', tags: ['寄存', '行李'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'south-gate', code: '图下入口', name: '图下入口', kind: 'gate', category: '入口', zone: '主会场下侧', nodeId: 'gate-south', summary: '主会场图下侧外部通口，正式朝向待现场确认。', tags: ['入口', '安检'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'upper-gate', code: '图上入口', name: '图上入口', kind: 'gate', category: '入口', zone: '主会场上侧', nodeId: 'gate-upper', summary: '主会场图上侧外部通口，正式朝向待现场确认。', tags: ['入口', '安检'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'upper-exit-a', code: '图上左侧出口', name: '图上左侧出口', kind: 'gate', category: '出口', zone: '主会场图上侧', nodeId: 'exit-upper-1', summary: '主会场图上侧外部通口。', tags: ['出口', '离场'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
  { id: 'lower-exit-a', code: '图下最左侧出口', name: '图下最左侧出口', kind: 'gate', category: '出口', zone: '主会场图下侧', nodeId: 'exit-lower-1', summary: '主会场图下侧外部通口。', tags: ['出口', '离场'], accessible: true, status: 'scheduled', statusLabel: '状态待确认' },
];

const nodeById = new Map(nodes.map((node) => [node.id, node]));

function heuristic(fromId: string, toId: string) {
  const from = nodeById.get(fromId);
  const to = nodeById.get(toId);
  if (!from || !to) return Number.POSITIVE_INFINITY;
  return Math.hypot(from.x - to.x, from.y - to.y);
}

export function findRoute(
  startId: string,
  targetId: string,
  options: { closedEdgeIds?: string[]; wheelchair?: boolean } = {},
): RouteResult | null {
  if (options.wheelchair && !venue.accessibilityVerified) return null;
  const closed = new Set(options.closedEdgeIds ?? []);
  const adjacency = new Map<string, Array<{ edge: VenueEdge; next: string }>>();

  for (const edge of edges) {
    if (closed.has(edge.id) || (options.wheelchair && !edge.accessible)) continue;
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), { edge, next: edge.to }]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), { edge, next: edge.from }]);
  }

  const open = new Set([startId]);
  const cameFrom = new Map<string, { previous: string; edgeId: string }>();
  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([[startId, heuristic(startId, targetId)]]);

  while (open.size) {
    const current = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0];
    if (current === targetId) {
      const nodeIds = [current];
      const edgeIds: string[] = [];
      let cursor = current;
      while (cameFrom.has(cursor)) {
        const step = cameFrom.get(cursor)!;
        nodeIds.unshift(step.previous);
        edgeIds.unshift(step.edgeId);
        cursor = step.previous;
      }
      const distanceMeters = Math.round((gScore.get(current) ?? 0) * 10) / 10;
      const polyline = nodeIds.map((id) => {
        const node = nodeById.get(id)!;
        return { x: node.x, y: node.y };
      });
      return {
        nodeIds,
        edgeIds,
        distanceMeters,
        durationMinutes: Math.max(1, Math.ceil(distanceMeters / 60)),
        polyline,
        instructions: buildInstructions(nodeIds, distanceMeters),
      };
    }

    open.delete(current);
    for (const { edge, next } of adjacency.get(current) ?? []) {
      const tentative = (gScore.get(current) ?? Infinity) + edge.distanceMeters;
      if (tentative >= (gScore.get(next) ?? Infinity)) continue;
      cameFrom.set(next, { previous: current, edgeId: edge.id });
      gScore.set(next, tentative);
      fScore.set(next, tentative + heuristic(next, targetId));
      open.add(next);
    }
  }
  return null;
}

export function validateVenueGraph() {
  const issues: string[] = [];
  const knownNodes = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    if (node.x < 0 || node.x > venue.widthMeters || node.y < 0 || node.y > venue.heightMeters) {
      issues.push(`节点 ${node.id} 超出场馆边界`);
    }
  }
  for (const edge of edges) {
    if (!knownNodes.has(edge.from) || !knownNodes.has(edge.to)) issues.push(`通行边 ${edge.id} 引用了未知节点`);
    if (!Number.isFinite(edge.distanceMeters) || edge.distanceMeters <= 0) issues.push(`通行边 ${edge.id} 的距离无效`);
  }
  for (const place of places) {
    if (!knownNodes.has(place.nodeId)) issues.push(`地点 ${place.id} 缺少导航节点`);
  }
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }
  const visited = new Set<string>();
  const queue = [nodes[0]?.id].filter(Boolean) as string[];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) if (!visited.has(next)) queue.push(next);
  }
  if (visited.size !== nodes.length) issues.push(`静态通行图存在 ${nodes.length - visited.size} 个未连通节点`);
  return { valid: issues.length === 0, issues, checkedAt: new Date().toISOString() };
}

function buildInstructions(nodeIds: string[], distanceMeters: number) {
  if (nodeIds.length < 2) return ['你已到达目标位置。'];
  const first = nodeById.get(nodeIds[0])!;
  const last = nodeById.get(nodeIds[nodeIds.length - 1])!;
  const usesSouth = nodeIds.some((id) => id.startsWith('south-'));
  const usesNorth = nodeIds.some((id) => id.startsWith('north-'));
  const corridor = usesSouth && usesNorth ? '主疏散通道与连接通道' : usesSouth ? '下侧主疏散通道' : '上侧主疏散通道';
  return [
    `从${first.label}出发，进入${corridor}。`,
    `沿已发布路线前行，全程估算约 ${Math.round(distanceMeters)} 米，留意沿途区域标识。`,
    `到达${last.label}入口后，请现场确认位置。`,
  ];
}

export function searchPlaces(query: string, kind?: PlaceKind | 'all') {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  return places.filter((place) => {
    if (kind && kind !== 'all' && place.kind !== kind) return false;
    if (!normalized) return true;
    const haystack = [place.name, place.code, place.category, place.zone, place.summary, ...place.tags]
      .join(' ')
      .toLocaleLowerCase('zh-CN');
    return haystack.includes(normalized);
  });
}

export function getPlace(placeId: string) {
  return places.find((place) => place.id === placeId) ?? null;
}
