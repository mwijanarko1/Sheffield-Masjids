"use client";

import React from "react";
import AppBottomNav, { AppTab } from "@/components/AppBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#0A1128]">
      <div className="flex h-full w-full flex-col font-sans transition-colors duration-1000 text-white bg-gradient-to-b from-[#0A1128] to-[#1A2642]">
        <div className="flex-1 overflow-auto min-h-0">
          {children}
        </div>
        <AppBottomNav activeTab={activeTab} />
      </div>
    </main>
  );
}
