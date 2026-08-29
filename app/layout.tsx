import type { Metadata } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Expo Service AI｜智能逛展助手',
  description: '扫码定位、搜索展位、规划行程并沿场馆通道导航。',
  manifest: '/manifest.webmanifest',
  applicationName: 'Expo Service AI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Expo Service AI',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
