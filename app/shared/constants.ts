/** 观众端主色 */
export const AUDIENCE_PRIMARY = '#52C41A';
export const AUDIENCE_PRIMARY_LIGHT = '#7ED321';
export const AUDIENCE_BG = '#F7F8FA';
export const AUDIENCE_CARD = '#FFFFFF';

/** 主办端色 */
export const ADMIN_SIDEBAR_BG = '#1B1F2A';
export const ADMIN_TOPBAR_BG = '#242837';
export const ADMIN_BG = '#F0F2F5';

/** 热力色带 */
export const HEATMAP_COLORS = {
  low: 'rgba(82, 196, 26, 0.15)',
  mid: 'rgba(255, 165, 0, 0.35)',
  high: 'rgba(255, 50, 50, 0.5)',
} as const;

/** 分区配色 */
export const ZONE_COLORS = {
  workshop: '#FFF3E0',       // 橙色区
  sponsor: '#F3E5F5',        // 紫色区
  coding: '#E3F2FD',         // 蓝色区
  showcase: '#E3F2FD',       // 同 coding
  opening: '#E8F5E9',        // 绿色区
  checkin: '#FFF8E1',        // 浅黄
  security: '#FFEBEE',       // 浅红
  medical: '#FCE4EC',        // 粉色
  hardware: '#E0F7FA',       // 青色
  wildMan: '#E8F5E9',        // 绿色
  photo: '#FFF9C4',          // 明黄
  volunteer: '#ECEFF1',      // 灰
  luggage: '#ECEFF1',
  dining: '#FFF3E0',
  warehouse: '#ECEFF1',
  corridor: '#F5F5F5',       // 通道
} as const;

/** 展会名称 */
export const EXPO_TITLE = 'She Nicest 千人烈变黑客松 · 展厅 4';

/** 日期选项 */
export const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: '27-29', label: '27–29 日' },
  { value: '30-exhibit', label: '30 日上午展示' },
  { value: '30-closing', label: '30 日闭幕' },
];

/** 主办端额外日期选项 */
export const ADMIN_DAY_OPTIONS: { value: string; label: string }[] = [
  { value: '26', label: '26 日开幕' },
  ...DAY_OPTIONS,
];
