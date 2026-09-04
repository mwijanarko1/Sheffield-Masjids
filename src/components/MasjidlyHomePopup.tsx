"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import { useMasjidlyPromoOverlay } from "@/contexts/MasjidlyPromoOverlayContext";
import {
  MASJIDLY_MODERN_SKIES,
  textColorForTheme,
} from "@/lib/masjidly-theme";
import {
  MASJIDLY_APP_STORE_URL,
  MASJIDLY_PLAY_STORE_URL,
} from "@/lib/site";

const MASJIDLY_CLICKED_KEY = "masjidly_download_clicked";

function markClicked() {
  try {
    window.localStorage.setItem(MASJIDLY_CLICKED_KEY, "1");
  } catch {
    // Silently ignore persistence failure
  }
}

export default function MasjidlyHomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const masjidlyPromo = useMasjidlyPromoOverlay();
  const { theme } = useMasjidlyTheme();
  const sky = MASJIDLY_MODERN_SKIES[theme];
  const fg = textColorForTheme(theme);

  useEffect(() => {
    try {
      const clicked = window.localStorage.getItem(MASJIDLY_CLICKED_KEY);
      if (!clicked) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable: skip modal
    }
  }, []);

  const setPromoOpen = masjidlyPromo?.setPromoOpen;

  useEffect(() => {
    if (!setPromoOpen) return;
    setPromoOpen(isOpen);
    return () => {
      setPromoOpen(false);
    };
  }, [isOpen, setPromoOpen]);

  function handleDownloadClick() {
    markClicked();
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border-white/25 p-0 font-sans shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
        style={{ background: sky.sky, color: fg }}
      >
        {/* Gradient hairline border */}
        <div className="relative px-7 pb-8 pt-9 sm:px-10 sm:pb-10 sm:pt-11">
          <DialogClose
            aria-label="Close"
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <X size={19} strokeWidth={1.7} aria-hidden />
          </DialogClose>

          {/* Main column */}
          <div className="flex min-w-0 flex-col items-center text-center">
            {/* Header: icon left + titles */}
            <div className="mb-7 flex items-center gap-3 self-start pr-10">
              <img
                src="/masjidly/app-icon.png"
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-2xl shadow-sm"
              />
              <div className="text-left">
                <p className="text-base font-semibold tracking-tight">Masjidly</p>
                <p className="mt-0.5 text-xs opacity-75">Official masjid prayer times</p>
              </div>
            </div>

            <div
              className="mb-5 flex size-20 items-center justify-center rounded-full border border-current/20 bg-white/10 ring-1 ring-current/10 ring-offset-4 ring-offset-transparent"
              aria-hidden
            >
              <ArrowDownToLine size={30} strokeWidth={1.3} />
            </div>
            <DialogTitle
              className="text-[2.25rem] font-light leading-[1.15] tracking-[-0.03em] sm:text-[2.5rem]"
              style={{ color: fg }}
            >
              Your masjid.
              <br />
              In your pocket.
            </DialogTitle>
            <DialogDescription
              className="mt-4 max-w-xs text-sm leading-relaxed"
              style={{ color: fg, opacity: 0.78 }}
            >
              Prayer times, iqamah countdowns and reminders.
              Qibla, widgets and offline access, wherever you are.
            </DialogDescription>
            <p className="mb-7 mt-4 rounded-full border border-current/15 bg-white/15 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em]">
              Free to use. No ads.
            </p>

            <div className="flex w-full flex-col gap-3">
              <a
                href={MASJIDLY_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="flex min-h-16 items-center justify-center gap-3 rounded-xl border border-white/40 bg-black px-5 py-2.5 text-white transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF] focus-visible:ring-offset-2"
              >
                <svg width="30" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-left">
                  <span className="block text-[11px] leading-tight">Download on the</span>
                  <span className="block text-2xl font-medium leading-tight tracking-tight">App Store</span>
                </span>
              </a>
              <a
                href={MASJIDLY_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="flex min-h-16 items-center justify-center gap-3 rounded-xl border border-white/40 bg-black px-5 py-2.5 text-white transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF] focus-visible:ring-offset-2"
              >
                <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden>
                  <path d="M1 1L17 17 1 33Z" fill="#4285F4" />
                  <path d="M1 1L21 12 17 17Z" fill="#34A853" />
                  <path d="M17 17L21 22 1 33Z" fill="#EA4335" />
                  <path d="M21 12L29 16.4Q30 17 29 17.6L21 22 17 17Z" fill="#FBBC04" />
                </svg>
                <span className="text-left">
                  <span className="block text-[10px] font-medium uppercase leading-tight tracking-wide">Get it on</span>
                  <span className="block text-2xl font-medium leading-tight tracking-tight">Google Play</span>
                </span>
              </a>
            </div>
            <a
              href="/masjidly"
              onClick={handleDownloadClick}
              className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              Learn more about Masjidly
              <ChevronRight size={14} aria-hidden />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
