import type { Metadata } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

const siteUrl = new URL(process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000');
const title = 'Expo Service AI｜智能逛展助手';
const description = '扫码定位、搜索展位、规划行程并沿场馆通道导航。';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  manifest: '/manifest.webmanifest',
  applicationName: 'Expo Service AI',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: 'Expo Service AI',
    title,
    description,
    images: [{ url: '/og.png', alt: 'Expo Service AI 智能逛展助手' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
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
