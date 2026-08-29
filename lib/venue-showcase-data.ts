export type BoothCol = 'A' | 'B' | 'C' | 'D' | 'E';
export type BoothStatus = 'ready' | 'busy' | 'away' | 'closed';
export type ActivityStatus = 'scheduled' | 'live' | 'delayed' | 'ended';

export type ShowcaseVenue = {
  id: string;
  name: string;
  hall: string;
  areaLabel: string;
  active: boolean;
};

export type ShowcaseBooth = {
  id: string;
  col: BoothCol;
  row: number;
  companyName: string;
  category: string;
  offers: string;
  wants: string;
  owner: string;
  status: BoothStatus;
  visitorCount: number;
  currentDensity: number;
  avgDwellMinutes: number;
  businessLeads: number;
  heatScore: number;
  nodeId: string;
  featured?: boolean;
};

export type ShowcaseKeyword = { rank: number; keyword: string; count: number };
export type ShowcaseRoute = { rank: number; label: string; uses: number; fromGate: string; boothIds: string[] };
export type ShowcaseAlert = { id: string; level: 'danger' | 'warning' | 'info'; title: string; detail: string; time: string };
export type ShowcaseActivity = {
  id: string;
  boothId: string;
  placeLabel: string;
  title: string;
  start: string;
  end: string;
  capacity: number;
  reserved: number;
  status: ActivityStatus;
  delayMinutes?: number;
};

export const showcaseVenues: ShowcaseVenue[] = [
  { id: 'ncc-p2-h4', name: '国家会议中心二期', hall: '4号展厅', areaLabel: '约 12,000㎡', active: true },
  { id: 'ncc-p1-h3', name: '国家会议中心一期', hall: '3号展厅', areaLabel: '约 8,600㎡', active: false },
  { id: 'niec-p2-e1', name: '北京新国展二期', hall: 'E1馆', areaLabel: '约 10,400㎡', active: false },
];

export const showcaseEvent = {
  id: 'aitex-2026',
  fullName: '2026 国际未来科技与智能装备博览会',
  shortName: 'AITEX 2026',
  tracks: ['具身机器人', '通用大模型', 'AI芯片与算力', '智能教育', '新能源装备'],
};

export const overviewKpis = [
  { id: 'visitors', label: '今日访客', value: '8,642', delta: 12.5, up: true, note: '较昨日', icon: 'users' },
  { id: 'routes', label: '路线生成次数', value: '2,318', delta: 18.7, up: true, note: '较昨日', icon: 'nav' },
  { id: 'hot', label: '热门展位', value: 'T-E05', delta: null, up: true, note: '当前最受欢迎展位', icon: 'star' },
  { id: 'matches', label: '供需撮合', value: '324', delta: 8.3, up: true, note: '较昨日', icon: 'search' },
] as const;

const COLS: BoothCol[] = ['A', 'B', 'C', 'D', 'E'];
const COL_CATEGORY: Record<BoothCol, string> = {
  A: '具身机器人',
  B: 'AI芯片与算力',
  C: '通用大模型',
  D: '新能源装备',
  E: '智能教育',
};
const COL_NODE: Record<BoothCol, string> = {
  A: 'zone-workshop',
  B: 'zone-sponsor',
  C: 'zone-coding',
  D: 'zone-robot',
  E: 'zone-rest',
};

type ExhibitorSeed = {
  id: string;
  companyName: string;
  category?: string;
  offers: string;
  wants: string;
  owner: string;
  status: BoothStatus;
  visitorCount: number;
  currentDensity: number;
  avgDwellMinutes: number;
  businessLeads: number;
  featured?: boolean;
};

const EXHIBITORS: ExhibitorSeed[] = [
  { id: 'T-E05', companyName: '智育灵犀', offers: '多模态互动教学机器人与课堂操作系统', wants: '渠道合作与内容教研伙伴', owner: '林晓荷', status: 'busy', visitorCount: 1286, currentDensity: 0.96, avgDwellMinutes: 18, businessLeads: 86, featured: true },
  { id: 'T-C08', companyName: '星河智算', offers: '行业大模型与智能协同解决方案', wants: '垂直场景语料与落地陪跑', owner: '周启明', status: 'ready', visitorCount: 742, currentDensity: 0.64, avgDwellMinutes: 16, businessLeads: 54, featured: true },
  { id: 'T-A04', companyName: '步云人形', offers: '人形双足机器人演练与接待', wants: '关节模组与运动控制算法', owner: '韩予安', status: 'busy', visitorCount: 918, currentDensity: 0.78, avgDwellMinutes: 14, businessLeads: 61, featured: true },
  { id: 'T-B05', companyName: '驭界芯片', offers: '车载高算力芯片与智驾域控制器', wants: '主机厂定点与车规认证', owner: '赵闻川', status: 'ready', visitorCount: 1042, currentDensity: 0.88, avgDwellMinutes: 15, businessLeads: 73, featured: true },
  { id: 'T-D08', companyName: '质检灵械', offers: '具身智能工业质检机械臂', wants: '产线改造与视觉模型', owner: '沈若兰', status: 'ready', visitorCount: 687, currentDensity: 0.61, avgDwellMinutes: 17, businessLeads: 49, featured: true },
  { id: 'T-C05', companyName: '澜图工坊', offers: '企业知识助手与多智能体编排', wants: '私有化部署与安全合规', owner: '何清越', status: 'busy', visitorCount: 896, currentDensity: 0.81, avgDwellMinutes: 13, businessLeads: 58 },
  { id: 'T-A05', companyName: '灵动双臂', offers: '七轴协作机器人与柔性夹具', wants: '3C 装配产线集成商', owner: '吴承泽', status: 'ready', visitorCount: 704, currentDensity: 0.7, avgDwellMinutes: 12, businessLeads: 41 },
  { id: 'T-A03', companyName: '感知矩阵', offers: '固态激光雷达与多传感器融合', wants: '无人配送与巡检场景', owner: '陈予白', status: 'ready', visitorCount: 512, currentDensity: 0.52, avgDwellMinutes: 11, businessLeads: 33 },
  { id: 'T-A06', companyName: '四足巡界', offers: '四足巡检机器人与热成像套件', wants: '能源场站运维订单', owner: '马景行', status: 'ready', visitorCount: 468, currentDensity: 0.48, avgDwellMinutes: 12, businessLeads: 29 },
  { id: 'T-A08', companyName: '仿生巧手', offers: '工业灵巧手与触觉传感', wants: '人形本体厂家配套', owner: '梁知夏', status: 'away', visitorCount: 321, currentDensity: 0.34, avgDwellMinutes: 10, businessLeads: 18 },
  { id: 'T-A12', companyName: '步态实验室', offers: '开源人形关节模组', wants: '高校与创客渠道', owner: '冯一川', status: 'ready', visitorCount: 198, currentDensity: 0.22, avgDwellMinutes: 9, businessLeads: 11 },
  { id: 'T-B02', companyName: '域控智驾', offers: '中央计算+域控制器参考设计', wants: 'Tier 1 联合开发', owner: '孙嘉树', status: 'ready', visitorCount: 455, currentDensity: 0.46, avgDwellMinutes: 14, businessLeads: 36 },
  { id: 'T-B04', companyName: '车规芯核', offers: '车规 MCU 与功能安全套件', wants: 'ISO 26262 咨询伙伴', owner: '郑北辰', status: 'ready', visitorCount: 388, currentDensity: 0.41, avgDwellMinutes: 11, businessLeads: 24 },
  { id: 'T-B06', companyName: '边缘智盒', offers: '车端/厂端边缘推理盒子', wants: '算力租赁与模型压缩', owner: '钱亦辰', status: 'busy', visitorCount: 540, currentDensity: 0.55, avgDwellMinutes: 12, businessLeads: 31 },
  { id: 'T-B08', companyName: '深算光互联', offers: '液冷算力柜与光互联交换', wants: '智算中心集成', owner: '曹明远', status: 'ready', visitorCount: 276, currentDensity: 0.29, avgDwellMinutes: 13, businessLeads: 19 },
  { id: 'T-B10', companyName: '协同机械', offers: '人机共线协作机器人', wants: '汽车焊装集成商', owner: '尹秋白', status: 'ready', visitorCount: 349, currentDensity: 0.37, avgDwellMinutes: 11, businessLeads: 22 },
  { id: 'T-C02', companyName: '知图谱', offers: '行业知识引擎与检索增强', wants: '能源/制造语料共建', owner: '潘书衡', status: 'ready', visitorCount: 410, currentDensity: 0.43, avgDwellMinutes: 15, businessLeads: 27 },
  { id: 'T-C11', companyName: '多智能体所', offers: '企业级 Agent 编排平台', wants: 'OA / CRM 连接器', owner: '高宁', status: 'ready', visitorCount: 303, currentDensity: 0.31, avgDwellMinutes: 14, businessLeads: 21 },
  { id: 'T-D04', companyName: '储能枢纽', offers: '工商业储能与微网调度', wants: '园区综合能源项目', owner: '叶青川', status: 'ready', visitorCount: 361, currentDensity: 0.39, avgDwellMinutes: 12, businessLeads: 26 },
  { id: 'T-D05', companyName: '光追阵列', offers: '光伏跟踪支架与智能运维', wants: '电站 EPC 合作', owner: '任山河', status: 'busy', visitorCount: 594, currentDensity: 0.58, avgDwellMinutes: 10, businessLeads: 34 },
  { id: 'T-D07', companyName: '氢能装备', offers: '电解槽与加氢撬装模块', wants: '示范线联合申报', owner: '汪澈', status: 'ready', visitorCount: 247, currentDensity: 0.27, avgDwellMinutes: 13, businessLeads: 16 },
  { id: 'T-D12', companyName: '柔性产线', offers: '新能源电驱柔性装配线', wants: '产线数字孪生伙伴', owner: '崔嘉宁', status: 'ready', visitorCount: 188, currentDensity: 0.2, avgDwellMinutes: 11, businessLeads: 12 },
  { id: 'T-E03', companyName: '课堂伙伴', offers: '教育平板 + 语音伴学机器人', wants: '区域教育局试点', owner: '苏晚晴', status: 'ready', visitorCount: 512, currentDensity: 0.5, avgDwellMinutes: 16, businessLeads: 38 },
  { id: 'T-E07', companyName: '编程少年', offers: 'STEAM 编程机器人套件', wants: '校内社团与赛事渠道', owner: '姜北', status: 'ready', visitorCount: 266, currentDensity: 0.28, avgDwellMinutes: 14, businessLeads: 17 },
  { id: 'T-E10', companyName: '实验舱', offers: '中小学科学实验智能教具', wants: '教装集采目录入围', owner: '陆知秋', status: 'away', visitorCount: 141, currentDensity: 0.16, avgDwellMinutes: 9, businessLeads: 8 },
];

const exhibitorById = new Map(EXHIBITORS.map((item) => [item.id, item]));

function emptyMetrics(col: BoothCol, row: number) {
  const seed = (COLS.indexOf(col) + 1) * 17 + row * 13;
  return {
    visitorCount: 8 + (seed % 12),
    currentDensity: 0.03 + ((seed % 5) / 200),
    avgDwellMinutes: 4 + (seed % 3),
    businessLeads: seed % 2,
  };
}

function buildBooths(): ShowcaseBooth[] {
  const raw: Omit<ShowcaseBooth, 'heatScore'>[] = [];
  for (const col of COLS) {
    for (let row = 1; row <= 12; row += 1) {
      const id = `T-${col}${String(row).padStart(2, '0')}`;
      const seeded = exhibitorById.get(id);
      const fallback = emptyMetrics(col, row);
      raw.push({
        id,
        col,
        row,
        companyName: seeded?.companyName ?? '待布展',
        category: seeded?.category ?? COL_CATEGORY[col],
        offers: seeded?.offers ?? `${COL_CATEGORY[col]}标准展位`,
        wants: seeded?.wants ?? '',
        owner: seeded?.owner ?? '—',
        status: seeded?.status ?? 'closed',
        visitorCount: seeded?.visitorCount ?? fallback.visitorCount,
        currentDensity: seeded?.currentDensity ?? fallback.currentDensity,
        avgDwellMinutes: seeded?.avgDwellMinutes ?? fallback.avgDwellMinutes,
        businessLeads: seeded?.businessLeads ?? fallback.businessLeads,
        nodeId: COL_NODE[col],
        featured: seeded?.featured,
      });
    }
  }
  const maxVisitors = Math.max(...raw.map((item) => item.visitorCount), 1);
  const maxLeads = Math.max(...raw.map((item) => item.businessLeads), 1);
  return raw.map((item) => ({
    ...item,
    heatScore: Number((0.4 * item.currentDensity + 0.35 * (item.visitorCount / maxVisitors) + 0.25 * (item.businessLeads / maxLeads)).toFixed(4)),
  }));
}

export const showcaseBooths = buildBooths();
export const featuredBooths = showcaseBooths.filter((booth) => booth.featured);
export const occupiedBooths = showcaseBooths.filter((booth) => booth.companyName !== '待布展');

export function getBooth(id: string) {
  return showcaseBooths.find((booth) => booth.id === id) ?? null;
}

export function computeHeatScore(booth: Pick<ShowcaseBooth, 'currentDensity' | 'visitorCount' | 'businessLeads'>, maxVisitors = 1286, maxLeads = 86) {
  return 0.4 * booth.currentDensity + 0.35 * (booth.visitorCount / maxVisitors) + 0.25 * (booth.businessLeads / maxLeads);
}

export const searchKeywords: ShowcaseKeyword[] = [
  { rank: 1, keyword: '充电桩', count: 1286 },
  { rank: 2, keyword: '人形机器人', count: 1024 },
  { rank: 3, keyword: '芯片算力', count: 892 },
  { rank: 4, keyword: '会议室', count: 763 },
  { rank: 5, keyword: '大模型方案', count: 612 },
  { rank: 6, keyword: '餐饮区', count: 498 },
  { rank: 7, keyword: '洗手间', count: 412 },
  { rank: 8, keyword: '医疗点', count: 389 },
  { rank: 9, keyword: '咨询台', count: 321 },
  { rank: 10, keyword: '展品体验', count: 298 },
];

export const popularRoutes: ShowcaseRoute[] = [
  { rank: 1, label: '1号门 → T-E05', uses: 482, fromGate: 'gate-south', boothIds: ['T-E05'] },
  { rank: 2, label: '2号门 → T-B05 → T-C05', uses: 361, fromGate: 'gate-upper', boothIds: ['T-B05', 'T-C05'] },
  { rank: 3, label: '3号门 → T-D08 → T-E05', uses: 278, fromGate: 'exit-upper-1', boothIds: ['T-D08', 'T-E05'] },
  { rank: 4, label: '4号门 → T-A04', uses: 219, fromGate: 'exit-upper-2', boothIds: ['T-A04'] },
  { rank: 5, label: '5号门 → 餐饮商务洽谈区', uses: 187, fromGate: 'exit-lower-4', boothIds: [] },
];

export const schematicGates = [
  { id: '1', label: '1号门', cad: '南侧主入口', nodeId: 'gate-south' },
  { id: '2', label: '2号门', cad: '北侧 14 号门', nodeId: 'gate-upper' },
  { id: '3', label: '3号门', cad: '北侧 13 号门', nodeId: 'exit-upper-1' },
  { id: '4', label: '4号门', cad: '北侧 12 号门', nodeId: 'exit-upper-2' },
  { id: '5', label: '5号门', cad: '东南 F12 通道', nodeId: 'exit-lower-4' },
];

export const cadDoors = [
  { id: 'north-14', label: '北侧 14 号门', role: '主入口', nodeId: 'gate-upper' },
  { id: 'north-13', label: '北侧 13 号门', role: '出口', nodeId: 'exit-upper-1' },
  { id: 'north-12', label: '北侧 12 号门', role: '出口', nodeId: 'exit-upper-2' },
  { id: 'south-main', label: '南侧主入口', role: '主入口', nodeId: 'gate-south' },
  { id: 'f10', label: '东南 F10', role: '疏散口', nodeId: 'exit-lower-2' },
  { id: 'f11', label: '东南 F11', role: '疏散口', nodeId: 'exit-lower-3' },
  { id: 'f12', label: '东南 F12', role: '疏散口', nodeId: 'exit-lower-4' },
];

export const showcaseAlerts: ShowcaseAlert[] = [
  { id: 'crowd-e', level: 'danger', title: '通道拥堵', detail: 'E区主通道拥堵，请引导访客分流', time: '10:48' },
  { id: 'forum-delay', level: 'warning', title: '活动延迟', detail: '主论坛活动延迟 15 分钟开始', time: '10:45' },
  { id: 'screen-offline', level: 'info', title: '设备离线', detail: '导航屏 A区-03 离线', time: '10:40' },
];

export const infrastructure = [
  { id: 'match', label: 'AI 撮合服务', status: '运行中' },
  { id: 'nav', label: '智能导航', status: '运行中' },
  { id: 'sync', label: '数据同步', status: '正常' },
] as const;

export const showcaseActivities: ShowcaseActivity[] = [
  { id: 'act-forum', boothId: 'STAGE-MAIN', placeLabel: '主舞台', title: '主论坛：具身智能产业化', start: '13:30', end: '15:00', capacity: 400, reserved: 368, status: 'delayed', delayMinutes: 15 },
  { id: 'act-e05', boothId: 'T-E05', placeLabel: 'T-E05', title: '多模态互动教学 Demo', start: '14:00', end: '14:40', capacity: 40, reserved: 37, status: 'scheduled' },
  { id: 'act-a04', boothId: 'T-A04', placeLabel: 'T-A04', title: '人形双足机器人演练', start: '15:00', end: '15:45', capacity: 60, reserved: 52, status: 'scheduled' },
  { id: 'act-c08', boothId: 'T-C08', placeLabel: 'T-C08', title: '行业大模型落地路演', start: '16:00', end: '16:30', capacity: 80, reserved: 71, status: 'scheduled' },
  { id: 'act-b05', boothId: 'T-B05', placeLabel: 'T-B05', title: '车规高算力芯片发布', start: '16:40', end: '17:10', capacity: 50, reserved: 44, status: 'scheduled' },
  { id: 'act-d08', boothId: 'T-D08', placeLabel: 'T-D08', title: '工业质检机械臂工位演示', start: '14:20', end: '14:50', capacity: 36, reserved: 29, status: 'live' },
];

export const functionZones = [
  { id: 'STAGE-MAIN', name: '主舞台路演大厅', nodeId: 'zone-rest', where: '东侧' },
  { id: 'SERVICE-WEST', name: '西侧签到安检与综合服务', nodeId: 'poi-checkin', where: '西侧' },
  { id: 'MEAL-SOUTH', name: '南侧商务餐饮', nodeId: 'poi-dining', where: '南侧' },
  { id: 'LOUNGE-EAST', name: '商务洽谈区', nodeId: 'zone-sponsor', where: '东侧辅区' },
];

export const statusLabels: Record<BoothStatus, string> = {
  ready: '就绪',
  busy: '忙碌',
  away: '离岗',
  closed: '闭台',
};

export const categoryOptions = ['全部赛道', ...showcaseEvent.tracks];
export const maxKeywordCount = searchKeywords[0]?.count ?? 1;
export const hotBooth = getBooth('T-E05');

export const demoNotices = [
  { id: 9001, title: 'E区主通道拥堵，请引导分流', content: 'E区主通道通行速率下降，请引导访客从 4 号门 / 南侧辅道进入，避开 T-E05 门口排队。', audience: '全体观众', status: '已发布', createdAt: '10:48' },
  { id: 9002, title: '主论坛延迟 15 分钟', content: '主舞台「具身智能产业化」论坛预计 13:45 开始。已预约观众无需重新签到。', audience: '全体观众', status: '已发布', createdAt: '10:45' },
  { id: 9003, title: '导航屏 A区-03 离线', content: 'A 区 03 导览屏黑屏，已派发设备维修工单，现场以人工导视为准。', audience: '场馆运营', status: '已发布', createdAt: '10:40' },
  { id: 9004, title: 'T-E05 互动教学 Demo 14:00 开始', content: '智育灵犀多模态互动教学演示 14:00–14:40，展位前请控制围观密度。', audience: '全体观众', status: '已发布', createdAt: '10:22' },
  { id: 9005, title: '南侧餐饮 12:00–13:30 高峰', content: '南侧商务餐饮将迎来午高峰，建议错峰就餐，开发区及睡眠区内禁止用餐。', audience: '全体观众', status: '已发布', createdAt: '09:50' },
];

export const demoTickets = [
  { id: 'tk-net-e05', category: '网络', location: 'T-E05 智育灵犀', priority: '紧急', status: '处理中', assignee: '王调度', description: '展商专线抖动，互动教学 Demo 卡顿，需保障专线与备用链路。', source: 'exhibitor' as const, createdAt: '2026-08-29T10:12:00+08:00' },
  { id: 'tk-power-a04', category: '电力', location: 'T-A04 步云人形', priority: '紧急', status: '待分派', assignee: '未分派', description: '人形演练区申请临时增容 8kW，现有回路接近上限。', source: 'exhibitor' as const, createdAt: '2026-08-29T10:28:00+08:00' },
  { id: 'tk-device-a03', category: '设备', location: '导航屏 A区-03', priority: '普通', status: '处理中', assignee: '陈图审', description: '导览屏离线黑屏，需现场重启或更换主机。', source: 'operations' as const, createdAt: '2026-08-29T10:36:00+08:00' },
  { id: 'tk-meal-south', category: '物料', location: '南侧餐饮区', priority: '普通', status: '待确认', assignee: '李复核', description: '午高峰饮水补给不足，已补货等待现场确认。', source: 'operations' as const, createdAt: '2026-08-29T09:40:00+08:00' },
  { id: 'tk-crowd-e', category: '安保', location: 'E区主通道', priority: '紧急', status: '待分派', assignee: '未分派', description: 'T-E05 门口排队外溢，需增设分流栏并增派引导。', source: 'operations' as const, createdAt: '2026-08-29T10:46:00+08:00' },
  { id: 'tk-net-b05', category: '网络', location: 'T-B05 驭界芯片', priority: '普通', status: '已完成', assignee: '王调度', description: '演示工位交换机端口故障，已更换模块恢复。', source: 'exhibitor' as const, createdAt: '2026-08-29T09:18:00+08:00' },
  { id: 'tk-clean-stage', category: '清洁', location: '主舞台', priority: '普通', status: '已完成', assignee: '李复核', description: '上午彩排后清场，座椅复位完成。', source: 'operations' as const, createdAt: '2026-08-29T08:55:00+08:00' },
];

export const demoAnalytics = {
  range: { label: '最近 24 小时', since: '2026-08-28T18:00:00+08:00', until: '2026-08-29T18:00:00+08:00' },
  metrics: {
    active_sessions: { value: 1864, suppressed: false },
    searches: { value: 4126, suppressed: false },
    no_result_searches: { value: 186, suppressed: false },
    booth_views: { value: 5620, suppressed: false },
    routes_started: { value: 2318, suppressed: false },
    arrivals: { value: 1488, suppressed: false },
    reservations: { value: 412, suppressed: false },
  },
  keywords: searchKeywords.map((item) => ({ keyword: item.keyword, total: item.count })),
};

export const demoMembers = [
  { user_id: 'u-zhang', email_snapshot: 'zhang.admin@shouhui.demo', display_name: '张管理员', role: 'organizer_admin' },
  { user_id: 'u-li', email_snapshot: 'li.review@ncc.demo', display_name: '李复核', role: 'venue_admin' },
  { user_id: 'u-wang', email_snapshot: 'wang.dispatch@ncc.demo', display_name: '王调度', role: 'dispatcher' },
  { user_id: 'u-chen', email_snapshot: 'chen.map@ncc.demo', display_name: '陈图审', role: 'map_reviewer' },
];

export const demoPendingInvites = [
  { id: 'inv-editor', email_normalized: 'zhao.editor@ncc.demo', role: 'map_editor' },
];

