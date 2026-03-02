"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "Home" },
  { href: "/timetable", label: "Timetable" },
  { href: "/compare", label: "Compare" },
  { href: "/settings", label: "Settings" },
];

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

import { usePathname } from "next/navigation";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const appRoutes = new Set(["/", "/timetable", "/compare", "/settings"]);
  if (appRoutes.has(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1128]/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:max-w-7xl">
        <Link href="/" className="block">
          <h1 className="text-xl font-extrabold tracking-tight text-white transition-colors hover:text-[#FFB380] sm:text-2xl">
            Sheffield Masjids
          </h1>
        </Link>

        {/* Desktop: visible links */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/timetable"
            className="text-sm font-medium text-white/70 transition-colors hover:text-[#FFB380]"
          >
            Timetable
          </Link>
          <Link
            href="/compare"
            className="text-sm font-medium text-white/70 transition-colors hover:text-[#FFB380]"
          >
            Compare
          </Link>
          <Link
            href="/settings"
            className="text-sm font-medium text-white/70 transition-colors hover:text-[#FFB380]"
          >
            Settings
          </Link>
        </nav>

        {/* Mobile: Sheet with menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden -mr-2"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              <MenuIcon open={isOpen} />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="border-t border-white/10 bg-[#0A1128]/95 backdrop-blur-xl">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 font-medium text-white transition-colors",
                    "hover:bg-white/10 hover:text-[#FFB380]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
