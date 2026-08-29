/* =============================================================================
 *  ★★★  真实展会数据接入位（DATA SLOT）  ★★★
 *  ---------------------------------------------------------------------------
 *  这是整个 App 唯一的「数据入口」。所有页面（首页推荐、展位库、展位详情、
 *  地图路径、人流热力）都从这里读取展位数据与展馆平面图配置。
 *
 *  当前 App 使用的是【示例/虚拟数据】（见 ./booths.ts）。
 *  要接入你的真实展会，只需在下面两个地方填入真实数据即可，无需改动任何页面。
 *
 *  ── 你（或其他 AI）需要补的两块 ──────────────────────────────────────────
 *
 *  【1】真实展位清单 REAL_BOOTHS
 *      把从 Excel/CSV 解析出的每一行摊位，转换成 Booth 对象放进数组。
 *      字段含义见下方 Booth 类型注释。填好后把 USE_REAL_DATA 改为 true。
 *
 *  【2】真实展馆平面图 FLOOR_PLAN
 *      - backgroundImage：一张展馆平面图图片的 URL（把图片放到 /public 下，
 *        或用对象存储的公开地址）。设为 null 则使用内置的纯 SVG 网格底图。
 *      - viewBox：图片的坐标系宽高（通常等于图片像素宽高）。
 *      - 每个展位的 gx/gy 或直接给定坐标，用来在平面图上定位矩形。
 *
 *  展位/平面图属于静态内容。观众的兴趣、行程、打卡和当前位置仅保存在
 *  当前浏览器，不上传身份或位置数据。
 * ========================================================================== */

import { BOOTHS as SAMPLE_BOOTHS, type Booth, type BoothCategory } from "./booths";

export type { Booth, BoothCategory };

/* ---------------------------------------------------------------------------
 * 开关：接好真实数据后改成 true，App 立即改用 REAL_BOOTHS / REAL_FLOOR_PLAN。
 * ------------------------------------------------------------------------- */
export const USE_REAL_DATA = false;

/* ---------------------------------------------------------------------------
 * 【1】真实展位清单 —— 在这里填入解析后的真实摊位。
 *
 * Booth 字段说明：
 *   id              展位编号，如 "01"（字符串，建议两位补零）
 *   name            展位/摊位名称
 *   category        类别：robot|ai|chip|hardware|software|service（可自行增减，
 *                   若新增类别，同时在 ./booths.ts 的 CATEGORY_LABEL/COLORS 里加）
 *   intro           展位简介（一段话）
 *   keywords        关键词标签数组，如 ["机器人","导览"]
 *   recommendMinutes 推荐参观时长（分钟）
 *   image           缩略图 URL；留空字符串则用编号色块占位
 *   video           详情页视频封面 URL；留空则用色块占位
 *   owner           负责人 { name, role, org }，用于「一键联络」
 *   zone            所在区域，如 "A区"
 *   gx, gy          在平面图网格上的列/行坐标（从 0 开始）。若你用真实底图，
 *                   可按图片上摊位的相对位置给出格子坐标；地图会据此画矩形与路线。
 *
 * 示例（把它换成你的真实数据；可由 Excel/CSV 每行映射生成）：
 *   { id:"01", name:"XX机器人", category:"robot", intro:"…", keywords:["机器人"],
 *     recommendMinutes:20, image:"", video:"", zone:"A区",
 *     owner:{name:"张三",role:"展位负责人",org:"XX科技"}, gx:0, gy:0 }
 * ------------------------------------------------------------------------- */
export const REAL_BOOTHS: Booth[] = [
  // TODO: 在此粘贴/生成真实展位数组
];

/* ---------------------------------------------------------------------------
 * 【2】真实展馆平面图底图配置。
 *   backgroundImage: 展馆平面图图片地址（放 /public 或对象存储公开 URL）。
 *                    为 null 时使用内置纯 SVG 网格底图。
 *   viewBox:        图片坐标系，格式 "0 0 宽 高"（一般填图片像素宽高）。
 *   注意：填了真实底图后，请让上面每个展位的 gx/gy 或坐标与图片位置对应。
 * ------------------------------------------------------------------------- */
export interface FloorPlanConfig {
  backgroundImage: string | null;
  viewBox: string | null; // e.g. "0 0 1024 768"
}

export const REAL_FLOOR_PLAN: FloorPlanConfig = {
  backgroundImage: null, // TODO: 例如 "/floor-plan.png"
  viewBox: null, // TODO: 例如 "0 0 1024 768"
};

/* ---------------------------------------------------------------------------
 * 对外统一出口 —— 页面只认这两个导出，无需关心数据来自示例还是真实。
 * ------------------------------------------------------------------------- */
export const ACTIVE_BOOTHS: Booth[] =
  USE_REAL_DATA && REAL_BOOTHS.length > 0 ? REAL_BOOTHS : SAMPLE_BOOTHS;

export const ACTIVE_FLOOR_PLAN: FloorPlanConfig = USE_REAL_DATA
  ? REAL_FLOOR_PLAN
  : { backgroundImage: null, viewBox: null };

export function getActiveBooth(id: string): Booth | undefined {
  return ACTIVE_BOOTHS.find((b) => b.id === id);
}
