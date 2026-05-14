"use client";

import { useEffect, useState } from "react";
import { NIGHT_GRADIENT } from "@/components/DynamicBackground";
import { useMasjidlyPromoOverlay } from "@/contexts/MasjidlyPromoOverlayContext";
import { cn } from "@/lib/utils";

const MASJIDLY_CLICKED_KEY = "masjidly_download_clicked";

const APP_STORE_URL =
  "https://apps.apple.com/gb/app/masjidly-masjid-prayer-times/id6767841833";
const ANDROID_APK_PATH = "/masjidly/app-release.apk";

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

  useEffect(() => {
    try {
      const clicked = window.localStorage.getItem(MASJIDLY_CLICKED_KEY);
      if (!clicked) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable — skip modal
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

  function handleClose() {
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex min-h-0 items-center justify-center",
        "p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
        "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="masjidly-popup-headline"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 w-full min-h-0 max-w-lg px-0",
          "max-h-[min(92dvh,calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]",
        )}
      >
        {/* Gradient hairline border */}
        <div
          className={cn(
            "rounded-[1.35rem] bg-gradient-to-br from-amber-400/35 via-white/12 to-indigo-400/35 p-px",
            "shadow-[0_24px_80px_-16px_rgba(0,0,0,0.65)]",
            "animate-in fade-in zoom-in-95 duration-300 ease-out",
          )}
        >
          <div
            className={cn(
              "relative flex min-h-0 flex-col overflow-hidden rounded-[1.3125rem]",
              "border border-white/[0.07]",
              NIGHT_GRADIENT,
            )}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/45 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.1] hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 md:right-3 md:top-3"
            >
              <span className="text-[1.05rem] leading-none text-white/55" aria-hidden>
                ×
              </span>
            </button>

            {/* Main column */}
            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <div className="px-5 pb-5 pt-10 text-left sm:px-6 sm:pb-6 sm:pt-11">
                  {/* Header: icon left + titles */}
                  <div className="mb-5 flex gap-3.5 pr-8 sm:mb-6">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400/90 via-orange-500 to-rose-500/80 p-[2px] shadow-lg shadow-black/30 ring-1 ring-white/15 sm:h-[3.25rem] sm:w-[3.25rem]">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-gradient-to-br from-[#140c06] to-[#050308]">
                        <img
                          src="/masjidly/app-icon.png"
                          alt=""
                          className="h-[112%] w-[112%] object-cover opacity-[0.96]"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-lg font-bold tracking-tight text-white sm:text-xl">Masjidly</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-sky-200/65 sm:text-xs">
                        Official Sheffield masjid prayer times
                      </p>
                    </div>
                  </div>

                  <h2
                    id="masjidly-popup-headline"
                    className="mb-3 text-[1.35rem] font-bold leading-[1.2] tracking-tight sm:text-[1.5rem] sm:leading-snug md:text-[1.65rem]"
                  >
                    <span className="text-white">Your masjid.</span>{" "}
                    <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                      In your pocket.
                    </span>
                  </h2>

                  <p className="mb-5 max-w-prose text-[13px] leading-relaxed text-slate-300/95 sm:mb-6 sm:text-sm sm:leading-relaxed">
                    Live prayer times, iqamah countdowns, Ramadan views, Qibla, reminders, widgets, and
                    offline access.{" "}
                    <span className="font-semibold text-amber-300/95">Free, no ads.</span>
                  </p>

                  <div className="flex flex-col gap-2.5">
                    <a
                      href={APP_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleDownloadClick}
                      className="group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-4 py-3 text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_8px_32px_rgba(251,146,60,0.35)] transition hover:brightness-[1.05] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080f24] sm:py-3.5"
                    >
                      <span className="min-w-0 flex-1 text-left text-sm font-bold leading-tight sm:text-[0.95rem]">
                        Download on the App Store
                      </span>
                      <span
                        className="shrink-0 text-base font-semibold text-slate-900/45 transition group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        ›
                      </span>
                    </a>

                    <a
                      href={ANDROID_APK_PATH}
                      download="Masjidly.apk"
                      onClick={handleDownloadClick}
                      className="group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-sm transition hover:border-white/22 hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080f24] sm:py-3.5"
                    >
                      <span className="min-w-0 flex-1 text-left text-sm font-semibold leading-tight sm:text-[0.95rem]">
                        Download Android APK
                      </span>
                      <span
                        className="shrink-0 text-base font-semibold text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/55"
                        aria-hidden
                      >
                        ›
                      </span>
                    </a>
                  </div>

                  <div className="mt-4 text-center">
                    <a
                      href="/masjidly"
                      onClick={handleDownloadClick}
                      className="text-xs font-medium text-sky-300/55 transition-colors hover:text-sky-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080f24] rounded px-2 py-1"
                    >
                      Learn more about Masjidly →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
