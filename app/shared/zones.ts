import type { Zone } from './types';
import { ZONE_COLORS } from './constants';

/**
 * 18 分区多边形定义
 * 坐标系：x 0-100, y 0-33（展馆宽高比约 3:1）
 * 参照：微信图片_20260828214727.png（分区名）+ PDF 第4页（彩色位置）
 *
 * 展馆布局概览（从左到右）：
 * 左侧(西)：安检/签到/Workshop/赞助商/医疗/硬件等功能区
 * 中部：coding 大区（被主疏散通道纵劈为上下两块）
 * 右侧(东)：开幕/休息/闭幕区
 *
 * 页脚：分区 2026-08-28 标注 / 平面 0816 出图
 */
export const ZONES: Zone[] = [
  // === 左侧功能区 ===
  {
    id: 'security-1',
    name: '安检①',
    polygon: [
      { x: 2, y: 26 }, { x: 8, y: 26 },
      { x: 8, y: 31 }, { x: 2, y: 31 },
    ],
    color: ZONE_COLORS.security,
    labelPosition: { x: 5, y: 28.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '安检①', accessible: true },
      '27-29': { label: '安检①', accessible: true },
      '30-exhibit': { label: '安检①', accessible: true },
      '30-closing': { label: '安检①', accessible: true },
    },
  },
  {
    id: 'security-2',
    name: '安检②',
    polygon: [
      { x: 10, y: 26 }, { x: 16, y: 26 },
      { x: 16, y: 31 }, { x: 10, y: 31 },
    ],
    color: ZONE_COLORS.security,
    labelPosition: { x: 13, y: 28.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '安检②', accessible: true },
      '27-29': { label: '安检②（近拍照打卡）', accessible: true },
      '30-exhibit': { label: '安检②', accessible: true },
      '30-closing': { label: '安检②', accessible: true },
    },
  },
  {
    id: 'checkin',
    name: '签到区',
    polygon: [
      { x: 2, y: 20 }, { x: 12, y: 20 },
      { x: 12, y: 25 }, { x: 2, y: 25 },
    ],
    color: ZONE_COLORS.checkin,
    labelPosition: { x: 7, y: 22.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '签到区', accessible: true },
      '27-29': { label: '签到区', accessible: true },
      '30-exhibit': { label: '签到区', accessible: true },
      '30-closing': { label: '签到区', accessible: true },
    },
  },
  {
    id: 'workshop',
    name: 'Workshop',
    polygon: [
      { x: 2, y: 2 }, { x: 14, y: 2 },
      { x: 14, y: 10 }, { x: 2, y: 10 },
    ],
    color: ZONE_COLORS.workshop,
    labelPosition: { x: 8, y: 6 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: 'Workshop', accessible: true },
      '27-29': { label: 'Workshop', accessible: true },
      '30-exhibit': { label: 'Workshop', accessible: true },
      '30-closing': { label: 'Workshop', accessible: false },
    },
  },
  {
    id: 'sponsor',
    name: '赞助商区',
    polygon: [
      { x: 2, y: 11 }, { x: 14, y: 11 },
      { x: 14, y: 19 }, { x: 2, y: 19 },
    ],
    color: ZONE_COLORS.sponsor,
    labelPosition: { x: 8, y: 15 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '赞助商区（搭建中）', accessible: false },
      '27-29': { label: '赞助商区', accessible: true, note: '28–29 日 10:00–18:30' },
      '30-exhibit': { label: '赞助商区', accessible: true },
      '30-closing': { label: '赞助商区', accessible: false },
    },
  },
  {
    id: 'medical',
    name: '医疗区',
    polygon: [
      { x: 15, y: 20 }, { x: 21, y: 20 },
      { x: 21, y: 25 }, { x: 15, y: 25 },
    ],
    color: ZONE_COLORS.medical,
    labelPosition: { x: 18, y: 22.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '医疗区', accessible: true },
      '27-29': { label: '医疗区', accessible: true },
      '30-exhibit': { label: '医疗区', accessible: true },
      '30-closing': { label: '医疗区', accessible: true },
    },
  },
  {
    id: 'hardware-pickup',
    name: '硬件领取',
    polygon: [
      { x: 15, y: 11 }, { x: 21, y: 11 },
      { x: 21, y: 16 }, { x: 15, y: 16 },
    ],
    color: ZONE_COLORS.hardware,
    labelPosition: { x: 18, y: 13.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '硬件领取', accessible: true },
      '27-29': { label: '硬件领取', accessible: true },
      '30-exhibit': { label: '硬件领取', accessible: false },
      '30-closing': { label: '硬件领取', accessible: false },
    },
  },
  {
    id: 'hardware-robot',
    name: '硬件机器人开发区（专线网络）',
    polygon: [
      { x: 15, y: 2 }, { x: 21, y: 2 },
      { x: 21, y: 10 }, { x: 15, y: 10 },
    ],
    color: ZONE_COLORS.hardware,
    labelPosition: { x: 18, y: 6 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '机器人开发区', accessible: false },
      '27-29': { label: '机器人开发区', accessible: false },
      '30-exhibit': { label: '机器人开发区', accessible: false },
      '30-closing': { label: '机器人开发区', accessible: false },
    },
  },
  {
    id: '3d-print',
    name: '3D 打印区',
    polygon: [
      { x: 22, y: 2 }, { x: 27, y: 2 },
      { x: 27, y: 8 }, { x: 22, y: 8 },
    ],
    color: ZONE_COLORS.hardware,
    labelPosition: { x: 24.5, y: 5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '3D 打印区', accessible: false },
      '27-29': { label: '3D 打印区', accessible: false },
      '30-exhibit': { label: '3D 打印区', accessible: false },
      '30-closing': { label: '3D 打印区', accessible: false },
    },
  },
  {
    id: 'asustek-coding',
    name: '华硕电脑 Coding 区',
    polygon: [
      { x: 22, y: 9 }, { x: 27, y: 9 },
      { x: 27, y: 16 }, { x: 22, y: 16 },
    ],
    color: ZONE_COLORS.hardware,
    labelPosition: { x: 24.5, y: 12.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '华硕 Coding 区', accessible: false },
      '27-29': { label: '华硕 Coding 区', accessible: false },
      '30-exhibit': { label: '华硕 Coding 区', accessible: false },
      '30-closing': { label: '华硕 Coding 区', accessible: false },
    },
  },
  // === 中部大区：coding / showcase ===
  {
    id: 'coding',
    name: '选手开发区',
    polygon: [
      { x: 28, y: 2 }, { x: 72, y: 2 },
      { x: 72, y: 31 }, { x: 28, y: 31 },
    ],
    color: ZONE_COLORS.coding,
    labelPosition: { x: 50, y: 16.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '项目开发区（搭建中）', accessible: false },
      '27-29': { label: '选手开发区（禁止进入）', accessible: false, note: '选手专用' },
      '30-exhibit': { label: '30 日项目展示区', accessible: true },
      '30-closing': { label: '选手开发区', accessible: false },
    },
  },
  {
    id: 'showcase',
    name: '30 号项目展示区',
    polygon: [
      { x: 28, y: 2 }, { x: 72, y: 2 },
      { x: 72, y: 31 }, { x: 28, y: 31 },
    ],
    color: ZONE_COLORS.showcase,
    labelPosition: { x: 50, y: 16.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '（未启用）', accessible: false },
      '27-29': { label: '（未启用）', accessible: false },
      '30-exhibit': { label: '项目展示区', accessible: true },
      '30-closing': { label: '（已结束）', accessible: false },
    },
  },
  // === 右侧：开幕/闭幕/休息 ===
  {
    id: 'opening',
    name: '开幕/闭幕/休息区',
    polygon: [
      { x: 73, y: 2 }, { x: 98, y: 2 },
      { x: 98, y: 31 }, { x: 73, y: 31 },
    ],
    color: ZONE_COLORS.opening,
    labelPosition: { x: 85.5, y: 16.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '26 开幕式区域', accessible: true },
      '27-29': { label: '选手休息区（禁止进入）', accessible: false },
      '30-exhibit': { label: '闭幕式区域（以现场导视为准）', accessible: true },
      '30-closing': { label: '闭幕式', accessible: true },
    },
  },
  // === 其他功能区 ===
  {
    id: 'wild-man',
    name: '野人先生',
    polygon: [
      { x: 15, y: 26 }, { x: 21, y: 26 },
      { x: 21, y: 31 }, { x: 15, y: 31 },
    ],
    color: ZONE_COLORS.wildMan,
    labelPosition: { x: 18, y: 28.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '野人先生', accessible: true },
      '27-29': { label: '野人先生（12:00–18:00）', accessible: true },
      '30-exhibit': { label: '野人先生（12:00–18:00）', accessible: true, note: '30 日不补兑前期资格' },
      '30-closing': { label: '野人先生', accessible: false },
    },
  },
  {
    id: 'photo',
    name: '拍照打卡',
    polygon: [
      { x: 22, y: 26 }, { x: 27, y: 26 },
      { x: 27, y: 31 }, { x: 22, y: 31 },
    ],
    color: ZONE_COLORS.photo,
    labelPosition: { x: 24.5, y: 28.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '拍照打卡', accessible: true },
      '27-29': { label: '拍照打卡', accessible: true },
      '30-exhibit': { label: '拍照打卡', accessible: true },
      '30-closing': { label: '拍照打卡', accessible: true },
    },
  },
  {
    id: 'volunteer',
    name: '志愿者区 / 临时办公区',
    polygon: [
      { x: 22, y: 17 }, { x: 27, y: 17 },
      { x: 27, y: 25 }, { x: 22, y: 25 },
    ],
    color: ZONE_COLORS.volunteer,
    labelPosition: { x: 24.5, y: 21 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '志愿者/办公', accessible: false },
      '27-29': { label: '志愿者/办公', accessible: false },
      '30-exhibit': { label: '志愿者/办公', accessible: false },
      '30-closing': { label: '志愿者/办公', accessible: false },
    },
  },
  {
    id: 'luggage',
    name: '行李寄存',
    polygon: [
      { x: 73, y: 26 }, { x: 78, y: 26 },
      { x: 78, y: 31 }, { x: 73, y: 31 },
    ],
    color: ZONE_COLORS.luggage,
    labelPosition: { x: 75.5, y: 28.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '行李寄存', accessible: true },
      '27-29': { label: '行李寄存', accessible: true },
      '30-exhibit': { label: '行李寄存', accessible: true },
      '30-closing': { label: '行李寄存', accessible: true },
    },
  },
  {
    id: 'dining',
    name: '用餐区',
    polygon: [
      { x: 79, y: 26 }, { x: 88, y: 26 },
      { x: 88, y: 31 }, { x: 79, y: 31 },
    ],
    color: ZONE_COLORS.dining,
    labelPosition: { x: 83.5, y: 28.5 },
    audienceVisible: true,
    dayConfig: {
      '26': { label: '用餐区', accessible: true },
      '27-29': { label: '用餐区', accessible: true, note: '开发区及睡眠区内禁止用餐' },
      '30-exhibit': { label: '用餐区', accessible: true },
      '30-closing': { label: '用餐区', accessible: true },
    },
  },
  {
    id: 'warehouse',
    name: '临时仓储',
    polygon: [
      { x: 89, y: 26 }, { x: 98, y: 26 },
      { x: 98, y: 31 }, { x: 89, y: 31 },
    ],
    color: ZONE_COLORS.warehouse,
    labelPosition: { x: 93.5, y: 28.5 },
    audienceVisible: false,
    dayConfig: {
      '26': { label: '临时仓储', accessible: false },
      '27-29': { label: '临时仓储', accessible: false },
      '30-exhibit': { label: '临时仓储', accessible: false },
      '30-closing': { label: '临时仓储', accessible: false },
    },
  },
  // === 主疏散通道（不是摊位） ===
  {
    id: 'corridor-main',
    name: '主疏散通道',
    polygon: [
      { x: 28, y: 15 }, { x: 72, y: 15 },
      { x: 72, y: 18 }, { x: 28, y: 18 },
    ],
    color: ZONE_COLORS.corridor,
    labelPosition: { x: 50, y: 16.5 },
    audienceVisible: true,
    category: 'corridor',
    dayConfig: {
      '26': { label: '主通道', accessible: true },
      '27-29': { label: '主通道', accessible: true },
      '30-exhibit': { label: '主通道', accessible: true },
      '30-closing': { label: '疏散通道', accessible: true },
    },
  },
];

export default ZONES;
