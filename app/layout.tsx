import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: '辰程 AI｜会展行动 Agent',
  description: '说出目标，AI 为你匹配商机、规划行程、导航到场，并推动真实会面。',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: '辰程 AI｜说出目标，AI 带你抵达商机',
    description: '把参展目标转化为一条可执行路线：匹配、行程、导航、会面与跟进。',
    type: 'website',
    images: [{ url: '/og.png', width: 1732, height: 908, alt: '辰程 AI 会展行动 Agent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '辰程 AI｜说出目标，AI 带你抵达商机',
    description: '匹配商机、规划行程、导航到场，并推动真实会面。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
