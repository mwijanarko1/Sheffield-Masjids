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
  { href: "/compare", label: "Compare" },
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

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:max-w-7xl">
        <Link href="/" className="block">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground transition-colors hover:text-[var(--theme-primary)] sm:text-2xl">
            Sheffield Masjids
          </h1>
        </Link>

        {/* Desktop: visible links */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/compare"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[var(--theme-primary)]"
          >
            Compare
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
          <SheetContent side="top" className="border-t">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 font-medium text-foreground transition-colors",
                    "hover:bg-accent hover:text-[var(--theme-primary)]"
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
