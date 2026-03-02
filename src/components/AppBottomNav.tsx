"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Scale, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "prayer" | "compare" | "settings";

interface AppBottomNavProps {
  activeTab: AppTab;
}

const navItems: {
  tab: AppTab;
  href: string;
  label: string;
  Icon: typeof CalendarClock;
}[] = [
  { tab: "prayer", href: "/", label: "Prayer", Icon: CalendarClock },
  { tab: "compare", href: "/compare", label: "Compare", Icon: Scale },
  { tab: "settings", href: "/settings", label: "Settings", Icon: SlidersHorizontal },
];

export default function AppBottomNav({ activeTab }: AppBottomNavProps) {
  const router = useRouter();

  useEffect(() => {
    for (const item of navItems) {
      if (item.tab !== activeTab) {
        router.prefetch(item.href);
      }
    }
  }, [activeTab, router]);

  return (
    <nav
      className="shrink-0 w-full px-4 sm:px-6 pb-safe pt-1 sm:pt-2 bg-transparent"
      role="tablist"
      aria-label="Main navigation"
    >
      <div
        className="mx-auto max-w-sm flex items-stretch rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.tab === activeTab;
          return (
            <button
              key={item.tab}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => {
                if (item.tab !== activeTab) router.push(item.href);
              }}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 sm:py-3.5 min-h-[56px] sm:min-h-[60px]",
                "transition-all duration-200 ease-out touch-manipulation cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]/50 focus-visible:ring-inset",
                !isActive && "hover:bg-white/5 active:bg-white/10"
              )}
            >
              {/* Active background pill */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-1 rounded-xl pointer-events-none"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,179,128,0.25) 0%, rgba(255,120,60,0.12) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,210,170,0.4), 0 0 0 1px rgba(255,179,128,0.25)",
                  }}
                />
              )}
              <item.Icon
                className={cn(
                  "relative z-10 w-5 h-5 sm:w-[22px] sm:h-[22px] transition-colors duration-200",
                  isActive
                    ? "text-[#FFB380] [filter:drop-shadow(0_0_6px_rgba(255,179,128,0.5))]"
                    : "text-white/70 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.4))]"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] sm:text-[11px] font-medium tracking-wide transition-colors duration-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                  isActive ? "text-[#FFB380]" : "text-white/80"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
