"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  CalendarRange,
  ListChecks,
  Scale,
  SlidersHorizontal,
} from "lucide-react";

const TABS = [
  {
    id: "prayer",
    label: "Prayer",
    href: "/",
    icon: CalendarClock,
  },
  {
    id: "timetable",
    label: "Timetable",
    href: "/timetable",
    icon: CalendarRange,
  },
  {
    id: "lastTen",
    label: "Checklist",
    href: "/last-ten",
    icon: ListChecks,
  },
  {
    id: "compare",
    label: "Compare",
    href: "/compare",
    icon: Scale,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: SlidersHorizontal,
  },
] as const;

export function FloatingTabBar() {
  const pathname = usePathname();
  const innerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);
  const [slideStyle, setSlideStyle] = useState({ width: 0, x: 0 });

  function getActiveTab() {
    if (pathname === "/") return "prayer";
    if (pathname.startsWith("/timetable")) return "timetable";
    if (pathname.startsWith("/last-ten")) return "lastTen";
    if (pathname.startsWith("/compare")) return "compare";
    if (pathname.startsWith("/settings")) return "settings";
    return null;
  }

  const activeTab = getActiveTab();
  const activeIndex = activeTab
    ? TABS.findIndex((t) => t.id === activeTab)
    : -1;

  useLayoutEffect(() => {
    const container = innerRef.current;
    const activeElement = activeTabRef.current;

    if (!container || !activeElement || activeIndex < 0) {
      return;
    }

    let frame = 0;

    const syncActiveTab = () => {
      const nextWidth = activeElement.offsetWidth;
      const nextX = activeElement.offsetLeft;

      setSlideStyle((current) =>
        current.width === nextWidth && current.x === nextX
          ? current
          : { width: nextWidth, x: nextX }
      );

      const targetScrollLeft =
        nextX - (container.clientWidth - nextWidth) / 2;
      const maxScrollLeft = Math.max(
        0,
        container.scrollWidth - container.clientWidth
      );

      container.scrollTo({
        left: Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft),
        behavior: "smooth",
      });
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveTab);
    };

    scheduleSync();

    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(container);
    resizeObserver.observe(activeElement);
    window.addEventListener("resize", scheduleSync);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [activeIndex, pathname]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const navContent = (
    <nav className="floating-tab-bar" aria-label="Main navigation">
      <div ref={innerRef} className="floating-tab-bar-inner">
        <div
          className="floating-tab-slide"
          style={{
            opacity: activeIndex >= 0 ? 1 : 0,
            transform: `translateX(${slideStyle.x}px)`,
            width: `${slideStyle.width}px`,
          }}
          aria-hidden
        />
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              ref={isActive ? activeTabRef : null}
              className={`floating-tab ${isActive ? "floating-tab-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="floating-tab-icon">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  aria-hidden
                />
              </span>
              <span className="floating-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(navContent, document.body);
}
