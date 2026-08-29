"use client";

import type { ReactNode } from "react";
import { TabBar } from "@/components/shell/tab-bar";

/**
 * Mobile app shell: paper background, phone-width column, safe-area padding,
 * and a fixed bottom tab bar. Every product route renders inside this.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="no-scrollbar paper-bg relative flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto"
      style={{
        paddingTop: "max(56px, env(safe-area-inset-top, 0px))",
      }}
    >
      {/*
        Bottom reserve = tab bar height (~72px) + its distance from the viewport
        bottom + the safe-area inset + a small buffer. Computed so the fixed tab
        bar never overlaps the last row of content on any device. The scroll
        lives on this container (body stays h-full per template contract).
      */}
      <main
        className="relative w-full max-w-[430px] px-3.5 pt-2"
        style={{
          paddingBottom: "calc(72px + max(34px, env(safe-area-inset-bottom, 0px)) + 24px)",
        }}
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
