"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Responsive page shell: mobile column plus a wide desktop content canvas. */
export function PageShell({
  title,
  subtitle,
  right,
  back,
  children,
  noPadBottom,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
  children: ReactNode;
  noPadBottom?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-secondary lg:max-w-none lg:bg-transparent">
      {(title || back) && (
        <header
          data-el="page-header"
          className="sticky top-[68px] z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur lg:top-[76px] lg:mx-8 lg:mt-6 lg:rounded-2xl lg:border lg:px-8 lg:pb-5 lg:pt-5"
        >
          {back && (
            <button
              data-el="back-button"
              onClick={() => router.back()}
              className="-ml-1 flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary active:bg-secondary lg:size-10"
              aria-label="返回"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="truncate text-base font-semibold lg:text-2xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground lg:mt-1 lg:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      <main
        className={`${noPadBottom ? "flex-1" : "flex-1 pb-24"} lg:mx-auto lg:w-full lg:max-w-[1500px] lg:pb-0`}
      >
        {children}
      </main>
    </div>
  );
}
