"use client";

import React from "react";
import AppBottomNav, { AppTab } from "@/components/AppBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <div className="flex h-full w-full flex-col font-sans text-white min-h-0">
        <div className="flex-1 overflow-auto min-h-0">
          {children}
        </div>
        <AppBottomNav activeTab={activeTab} />
      </div>
    </main>
  );
}
