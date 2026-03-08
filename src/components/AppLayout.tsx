"use client";

import React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <div className="flex h-full w-full flex-col font-sans text-white min-h-0">
        <div className="flex-1 overflow-auto min-h-0 pb-24">{children}</div>
      </div>
    </main>
  );
}
