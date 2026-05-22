"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Sheffield Masjids" },
  { href: "/masjidly/terms", label: "Terms" },
  { href: "/masjidly/privacy", label: "Privacy" },
] as const;

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2";

const mobileLinkClass =
  "rounded-lg px-3 py-3 text-base font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2";

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

export default function MasjidlyMarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2 sm:px-5 sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pb-2">
      <div className="mx-auto w-full max-w-7xl">
        <div className="pointer-events-auto flex min-h-[3.25rem] items-center justify-between gap-3 rounded-full border border-neutral-200/90 bg-white/95 px-4 py-2 shadow-[0_8px_28px_-6px_rgb(0_0_0/0.12)] ring-1 ring-black/[0.06] backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:min-h-[3.5rem] sm:gap-4 sm:px-6 sm:py-2.5">
          <Link
            href="/masjidly"
            className="min-w-0 shrink rounded-lg px-1 text-lg font-semibold tracking-tight text-[#1a1a1a] transition hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
          >
            Masjidly
          </Link>

          <nav
            className="hidden min-w-0 items-center justify-end gap-1 sm:flex sm:gap-2"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 sm:hidden"
                aria-expanded={isOpen}
                aria-label="Toggle menu"
              >
                <MenuIcon open={isOpen} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="top"
              className={cn(
                "border-b border-neutral-200 bg-white/95 backdrop-blur-xl pt-[calc(4.5rem+env(safe-area-inset-top,0px))]",
                "[&>button]:text-neutral-600 [&>button]:hover:bg-neutral-100 [&>button]:data-[state=open]:bg-neutral-100"
              )}
            >
              <nav className="flex flex-col gap-1" aria-label="Main navigation">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={mobileLinkClass}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
