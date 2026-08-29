// Mock domain data for the Expo Guide demo. Frontend-stage fixtures.
// (Will be replaced by real persistence in the backend step.)

export type BoothCategory =
  | "robot"
  | "ai"
  | "chip"
  | "hardware"
  | "software"
  | "service";

export interface Booth {
  id: string; // "02"
  name: string;
  category: BoothCategory;
  intro: string;
  keywords: string[];
  recommendMinutes: number;
  image: string; // public image path or gradient seed color
  video: string; // detail media cover path or gradient seed
  owner: { name: string; role: string; org: string };
  zone: string; // "A区"
  // map grid cell (col,row) on a 6x6 booth grid
  gx: number;
  gy: number;
}

export const CATEGORY_LABEL: Record<BoothCategory, string> = {
  robot: "机器人",
  ai: "AI",
  chip: "芯片",
  hardware: "智能硬件",
  software: "软件平台",
  service: "服务",
};

export const CATEGORY_COLORS: Record<BoothCategory, string> = {
  robot: "#4c8f00",
  ai: "#74bd00",
  chip: "#16845b",
  hardware: "#91dc00",
  software: "#3f7d5a",
  service: "#708078",
};

const NAMES: Array<[string, BoothCategory, string, string[]]> = [
  ["智能服务机器人", "robot", "面向展馆导览的多模态服务机器人，支持语音问答与自主避障。", ["机器人", "多模态", "导览"]],
  ["协作机械臂", "robot", "轻量级六轴协作机械臂，适用于柔性产线与教学演示。", ["机械臂", "协作", "产线"]],
  ["AI 应用平台", "ai", "一站式 AI 应用编排平台，低代码接入大模型能力。", ["AI", "大模型", "低代码"]],
  ["视觉识别方案", "ai", "工业级视觉识别与缺陷检测方案，毫秒级推理。", ["视觉", "检测", "推理"]],
  ["半导体芯片", "chip", "面向端侧推理的低功耗 AI 芯片，算力密度领先。", ["芯片", "端侧", "低功耗"]],
  ["车规级 SoC", "chip", "车规级智能座舱 SoC，集成 NPU 与安全岛。", ["SoC", "车规", "NPU"]],
  ["智能穿戴设备", "hardware", "健康监测智能手表，支持连续血氧与睡眠分析。", ["穿戴", "健康", "手表"]],
  ["边缘计算网关", "hardware", "工业边缘计算网关，支持多协议接入与本地推理。", ["边缘", "网关", "工业"]],
  ["数字孪生平台", "software", "面向园区与工厂的数字孪生可视化平台。", ["孪生", "可视化", "园区"]],
  ["云原生中台", "software", "企业级云原生数据中台，弹性扩缩容。", ["云原生", "中台", "数据"]],
  ["智能教育机器人", "robot", "面向 K12 的编程教育机器人，图形化编程入门。", ["教育", "编程", "机器人"]],
  ["对话大模型", "ai", "中文对话大模型，支持长上下文与工具调用。", ["大模型", "对话", "工具"]],
  ["光电传感器", "chip", "高精度光电传感芯片，适用于激光雷达。", ["传感", "光电", "雷达"]],
  ["智能门锁", "hardware", "3D 人脸识别智能门锁，本地化隐私保护。", ["门锁", "人脸", "隐私"]],
  ["AR 显示模组", "hardware", "轻薄 AR 光波导显示模组，全彩高亮。", ["AR", "光波导", "显示"]],
  ["工业质检 AI", "ai", "面向 3C 制造的 AI 外观质检系统。", ["质检", "3C", "制造"]],
  ["服务器液冷", "hardware", "数据中心浸没式液冷方案，PUE 低至 1.05。", ["液冷", "数据中心", "节能"]],
  ["语音交互芯片", "chip", "离线语音唤醒与识别专用芯片。", ["语音", "离线", "唤醒"]],
  ["机器人操作系统", "software", "分布式机器人操作系统与仿真工具链。", ["ROS", "仿真", "分布式"]],
  ["智能物流分拣", "robot", "AGV + 视觉的智能仓储分拣方案。", ["AGV", "仓储", "分拣"]],
  ["生成式设计", "ai", "生成式工业设计工具，文本一键出图。", ["生成式", "设计", "出图"]],
  ["柔性电子皮肤", "hardware", "可穿戴柔性传感电子皮肤原型。", ["柔性", "传感", "皮肤"]],
  ["量子计算演示", "chip", "超导量子计算原型机现场演示。", ["量子", "超导", "计算"]],
  ["数字人主播", "ai", "实时驱动的 3D 数字人直播方案。", ["数字人", "直播", "3D"]],
  ["无人配送车", "robot", "低速无人配送车园区运营方案。", ["无人车", "配送", "园区"]],
  ["智能座舱", "hardware", "多屏融合智能座舱交互演示。", ["座舱", "多屏", "交互"]],
  ["隐私计算平台", "software", "多方安全计算与联邦学习平台。", ["隐私", "联邦", "安全"]],
  ["工业 5G 模组", "chip", "工业级 5G RedCap 通信模组。", ["5G", "RedCap", "工业"]],
  ["康复外骨骼", "robot", "下肢康复外骨骼机器人现场体验。", ["外骨骼", "康复", "体验"]],
  ["智能眼镜", "hardware", "AI 助手一体化智能眼镜。", ["眼镜", "AI助手", "拍摄"]],
];

const OWNERS = ["林工", "陈经理", "王博士", "赵总监", "刘工", "周经理"];
const ROLES = ["展位负责人", "产品经理", "技术总监", "解决方案专家"];
const ORGS = ["星尘科技", "智核半导体", "云见 AI", "格物机器人", "光年智造", "维数据"];
const ZONES = ["A区", "B区", "C区", "D区", "E区"];
export const BOOTHS: Booth[] = NAMES.map((n, i) => {
  const id = String(i + 1).padStart(2, "0");
  const image = `/booths/booth-${id}.webp`;
  const gx = i % 6;
  const gy = Math.floor(i / 6);
  return {
    id,
    name: n[0],
    category: n[1],
    intro: n[2],
    keywords: n[3],
    recommendMinutes: [15, 20, 25, 30][i % 4],
    image,
    video: image,
    owner: {
      name: OWNERS[i % OWNERS.length],
      role: ROLES[i % ROLES.length],
      org: ORGS[i % ORGS.length],
    },
    zone: ZONES[gy % ZONES.length],
    gx,
    gy,
  };
});

export function getBooth(id: string): Booth | undefined {
  return BOOTHS.find((b) => b.id === id);
}

export const CATEGORY_FILTERS: Array<{ key: "all" | BoothCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "robot", label: "机器人" },
  { key: "ai", label: "AI" },
  { key: "chip", label: "芯片" },
  { key: "hardware", label: "智能硬件" },
  { key: "software", label: "软件平台" },
];
