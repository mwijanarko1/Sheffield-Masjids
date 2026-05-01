"use client";

import React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[var(--theme-bg)]">
      <div className="flex h-full w-full flex-col font-sans text-white min-h-0">
        <div className="flex-1 overflow-auto min-h-0 pb-24">
          <div className="relative z-10 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
