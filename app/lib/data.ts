export type Point = { x: number; y: number };

export type Exhibitor = {
  id: string;
  name: string;
  booth: string;
  category: string;
  offers: string[];
  wants: string[];
  keywords: string[];
  intro: string;
  position: Point;
  availability: [string, string];
  contact: string;
  role: string;
};

export type VenueEvent = {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  keywords: string[];
  position: Point;
};

export type Poi = {
  id: string;
  name: string;
  type: 'food' | 'service';
  tags: string[];
  price?: number;
  open: [string, string];
  position: Point;
  location: string;
};

export type ExpoDataset = {
  exhibitors: Exhibitor[];
  events: VenueEvent[];
  pois: Poi[];
};

export const DEFAULT_DATASET: ExpoDataset = {
  exhibitors: [
    { id:'ex-a12', name:'青禾循环包装', booth:'A12', category:'包装与材料', offers:['环保包装','甘蔗浆模塑','小批量打样','美妆包装'], wants:['美妆品牌','采购负责人','渠道合作'], keywords:['环保','包装','美妆','材料','供应商','打样'], intro:'提供可降解甘蔗浆模塑包装与小批量快速打样服务。', position:{x:18,y:28}, availability:['09:30','16:40'], contact:'林悦', role:'商务负责人' },
    { id:'ex-a08', name:'极简智造', booth:'A08', category:'智能制造', offers:['柔性生产','包装自动化','小批量生产'], wants:['品牌客户','工厂合作'], keywords:['制造','生产','包装','自动化','工厂'], intro:'面向消费品牌提供柔性生产与包装自动化方案。', position:{x:34,y:18}, availability:['10:00','17:00'], contact:'赵楠', role:'解决方案顾问' },
    { id:'ex-b07', name:'沐川生物材料', booth:'B07', category:'包装与材料', offers:['可降解涂层','生物材料','食品级认证'], wants:['包装企业','联合研发','采购'], keywords:['环保','材料','可降解','涂层','研发'], intro:'专注可降解阻隔涂层和生物基材料，支持联合研发。', position:{x:49,y:48}, availability:['10:30','16:30'], contact:'周芮', role:'产品总监' },
    { id:'ex-b02', name:'知微消费者洞察', booth:'B02', category:'品牌服务', offers:['用户研究','社媒洞察','品牌策略'], wants:['消费品牌','新品调研'], keywords:['调研','消费者','社交媒体','品牌','营销'], intro:'使用多源数据帮助消费品牌发现未满足需求。', position:{x:48,y:20}, availability:['09:00','17:30'], contact:'何欣', role:'研究负责人' },
    { id:'ex-b11', name:'跃迁 AI 营销', booth:'B11', category:'AI 与数字服务', offers:['AI营销','内容生成','私域运营'], wants:['品牌客户','渠道伙伴'], keywords:['AI','营销','内容','私域','品牌'], intro:'为消费企业提供 AI 内容生产和私域增长解决方案。', position:{x:48,y:78}, availability:['09:30','17:20'], contact:'孟然', role:'联合创始人' },
    { id:'ex-c04', name:'寰宇跨境服务', booth:'C04', category:'出海服务', offers:['出海合规','跨境渠道','海外营销'], wants:['出海品牌','供应链伙伴'], keywords:['出海','跨境','合规','渠道','海外'], intro:'覆盖东南亚与欧洲市场的出海合规及渠道服务。', position:{x:78,y:18}, availability:['10:00','16:50'], contact:'王诗', role:'出海顾问' },
    { id:'ex-c13', name:'链路科技', booth:'C13', category:'供应链', offers:['供应链管理','智能仓储','物流优化'], wants:['零售品牌','制造企业'], keywords:['供应链','仓储','物流','零售'], intro:'以数字化工具优化仓储、补货与跨区域物流。', position:{x:75,y:48}, availability:['09:00','17:00'], contact:'刘晴', role:'客户经理' },
    { id:'ex-c21', name:'澄明消费基金', booth:'C21', category:'投资机构', offers:['消费投资','A轮前投资','产业资源'], wants:['消费科技','可持续品牌','创始人'], keywords:['投资','融资','基金','消费','可持续'], intro:'关注消费科技、可持续品牌和 A 轮前投资机会。', position:{x:82,y:78}, availability:['13:30','16:30'], contact:'陈诺', role:'投资经理' },
    { id:'ex-a03', name:'映界工业设计', booth:'A03', category:'设计服务', offers:['产品设计','包装设计','品牌视觉'], wants:['消费品牌','硬件团队'], keywords:['设计','包装','视觉','产品','品牌'], intro:'从工业设计到品牌视觉的一体化产品创新服务。', position:{x:13,y:15}, availability:['09:20','17:10'], contact:'苏禾', role:'设计总监' },
    { id:'ex-d06', name:'可信碳数', booth:'D06', category:'绿色服务', offers:['碳核算','ESG咨询','绿色认证'], wants:['制造企业','消费品牌'], keywords:['ESG','绿色','碳','认证','环保'], intro:'提供产品碳足迹、绿色认证和 ESG 数据服务。', position:{x:64,y:84}, availability:['10:00','17:30'], contact:'唐真', role:'项目经理' },
    { id:'ex-d12', name:'声桥多语科技', booth:'D12', category:'AI 与数字服务', offers:['实时翻译','会议字幕','多语客服'], wants:['国际展会','出海企业'], keywords:['翻译','多语','AI','出海','会议'], intro:'提供展会实时字幕、跨语言洽谈和多语客服。', position:{x:67,y:63}, availability:['09:00','17:30'], contact:'孔乐', role:'产品经理' },
    { id:'ex-a18', name:'轻舟零售', booth:'A18', category:'渠道服务', offers:['线下渠道','零售选品','快闪店'], wants:['新消费品牌','特色产品'], keywords:['渠道','零售','选品','消费','品牌'], intro:'连接购物中心和区域零售渠道，提供新品试销场景。', position:{x:27,y:64}, availability:['11:00','17:00'], contact:'徐琳', role:'渠道总监' },
  ],
  events: [
    { id:'ev-01', title:'AI 重做品牌增长', location:'论坛区 F1', start:'14:30', end:'15:10', keywords:['AI','营销','品牌','内容'], position:{x:60,y:28} },
    { id:'ev-02', title:'可持续材料与消费创新', location:'论坛区 F2', start:'15:20', end:'16:00', keywords:['环保','材料','可持续','消费'], position:{x:64,y:38} },
    { id:'ev-03', title:'出海新市场圆桌', location:'论坛区 F3', start:'13:40', end:'14:20', keywords:['出海','跨境','渠道'], position:{x:69,y:28} },
  ],
  pois: [
    { id:'poi-food-1', name:'京味小馆', type:'food', tags:['本地菜','正餐','无需出馆'], price:68, open:['11:00','19:00'], position:{x:25,y:86}, location:'二层西侧' },
    { id:'poi-food-2', name:'麦田轻食', type:'food', tags:['素食','轻食','快速'], price:45, open:['10:30','18:00'], position:{x:36,y:88}, location:'一层南侧' },
    { id:'poi-food-3', name:'北辰食集', type:'food', tags:['本地菜','多人用餐','选择多'], price:82, open:['11:00','21:00'], position:{x:88,y:88}, location:'场馆东门外 3 分钟' },
    { id:'poi-service-1', name:'综合服务台', type:'service', tags:['问询','失物招领','充电'], open:['08:30','18:00'], position:{x:12,y:88}, location:'南入口' },
    { id:'poi-service-2', name:'安静洽谈区', type:'service', tags:['会议','安静','预约'], open:['09:00','17:30'], position:{x:55,y:88}, location:'一层 D 区' },
  ],
};

export const ENTRANCES = [
  { id:'south', name:'南入口', position:{x:10,y:93} },
  { id:'east', name:'东入口', position:{x:93,y:53} },
  { id:'north', name:'北入口', position:{x:50,y:7} },
];
