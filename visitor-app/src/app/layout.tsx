import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LocaleSyncEffect } from "@/components/i18n/locale-sync-effect";
import { ExpoStoreProvider } from "@/stores/expo-store";
import { TabBar } from "@/components/shell/tab-bar";
import { getServerLocale } from "@/lib/i18n/server-preference";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const SITE_TITLE =
  process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "智能展会导览";
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() || "智能展会导览与行程规划";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "智能展会导览",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <body className="h-full flex flex-col">
        <I18nProvider>
          <LocaleSyncEffect />
          <ExpoStoreProvider>
            <div className="relative min-h-full pt-[68px] lg:pl-[104px] lg:pt-[76px]">
              {children}
            </div>
            <TabBar />
          </ExpoStoreProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
