import type { AdminDataset } from './types';

const ADMIN_KEY = 'shenicest-admin-data';
const SETTINGS_KEY = 'shenicest-admin-settings';

/** 默认空数据集 */
function emptyDataset(): AdminDataset {
  return {
    booths: [],
    schedule: [],
    pois: [],
    links: [],
    zoneOverrides: [],
    lastModified: new Date().toISOString(),
  };
}

/** 读取主办端数据（观众端也用这个读） */
export function readAdminData(): AdminDataset {
  if (typeof window === 'undefined') return emptyDataset();
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return emptyDataset();
    return JSON.parse(raw) as AdminDataset;
  } catch {
    return emptyDataset();
  }
}

/** 写入主办端数据（仅主办端调用） */
export function writeAdminData(data: AdminDataset): void {
  data.lastModified = new Date().toISOString();
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data));
}

/** 设置项 */
export type AdminSettings = {
  demoMode: boolean; // 演示数据开关
  floorplanApiKey: string;
  floorplanBase: string;
  floorplanModel: string;
};

const defaultSettings: AdminSettings = {
  demoMode: true,
  floorplanApiKey: '',
  floorplanBase: '',
  floorplanModel: '',
};

export function readSettings(): AdminSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function writeSettings(settings: AdminSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
