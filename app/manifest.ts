import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Expo Service AI 智能逛展助手',
    short_name: 'Expo Service AI',
    description: '扫码定位、搜索展位、规划行程并沿场馆通道导航。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f8f1',
    theme_color: '#0b3b28',
    lang: 'zh-CN',
    orientation: 'portrait',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
