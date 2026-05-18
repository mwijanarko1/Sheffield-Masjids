import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Top padding for hero column so the first line clears the fixed floating header bar
 * (same idea as `SITE_HEADER_OVERLAY_MAIN_PAD` in indonesiancafe).
 */
const MASJIDLY_FLOATING_HEADER_PAD =
  "pt-[calc(4.75rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.25rem+env(safe-area-inset-top,0px))] md:pt-[calc(5.5rem+env(safe-area-inset-top,0px))]";

function AppStoreBadge() {
  return (
    <a
      href="https://apps.apple.com/gb/app/masjidly-masjid-prayer-times/id6767841833"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 min-w-[10.5rem] items-center gap-2.5 rounded-xl bg-[#1a1a1a] px-4 py-2 text-white shadow-lg transition hover:bg-black hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[9px] font-medium uppercase tracking-wide text-white/80">
          Download on the
        </span>
        <span className="block text-[15px] font-semibold tracking-tight">App Store</span>
      </span>
    </a>
  );
}

function AndroidBadge() {
  return (
    <a
      href="/masjidly/Masjidly-1.0.1.apk"
      download="Masjidly-1.0.1.apk"
      className="inline-flex h-12 min-w-[10.5rem] items-center gap-2.5 rounded-xl bg-[#1a1a1a] px-4 py-2 text-white shadow-lg transition hover:bg-black hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
    >
      <span className="inline-flex shrink-0 text-[#3DDC84]" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path d="M17.523 15.3414C17.523 15.6414 17.2805 15.8839 16.9805 15.8839H16.3992V18.1402C16.3992 18.8077 15.8555 19.3514 15.188 19.3514C14.5205 19.3514 13.9767 18.8077 13.9767 18.1402V15.8839H9.99924V18.1402C9.99924 18.8077 9.45549 19.3514 8.78799 19.3514C8.12049 19.3514 7.57674 18.8077 7.57674 18.1402V15.8839H6.99549C6.69549 15.8839 6.45299 15.6414 6.45299 15.3414V8.23267H17.523V15.3414ZM4.99924 8.23267C4.33174 8.23267 3.78799 8.77642 3.78799 9.44392V14.1302C3.78799 14.7977 4.33174 15.3414 4.99924 15.3414C5.66674 15.3414 6.21049 14.7977 6.21049 14.1302V9.44392C6.21049 8.77642 5.66674 8.23267 4.99924 8.23267ZM19.0267 8.23267C18.3592 8.23267 17.8155 8.77642 17.8155 9.44392V14.1302C17.8155 14.7977 18.3592 15.3414 19.0267 15.3414C19.6942 15.3414 20.238 14.7977 20.238 14.1302V9.44392C20.238 8.77642 19.6942 8.23267 19.0267 8.23267ZM15.3042 4.52392L16.3517 2.72642C16.4292 2.59142 16.3867 2.42017 16.2517 2.34267C16.1167 2.26517 15.9455 2.30767 15.868 2.44267L14.8017 4.27267C13.9992 3.94767 13.118 3.76642 12.188 3.76642C11.258 3.76642 10.3767 3.94767 9.57424 4.27267L8.50799 2.44267C8.43049 2.30767 8.25924 2.26517 8.12424 2.34267C7.98924 2.42017 7.94674 2.59142 8.02424 2.72642L9.07174 4.52392C7.29399 5.42392 6.11674 7.23642 6.11674 9.31892H18.2592C18.2592 7.23642 17.082 5.42392 15.3042 4.52392ZM9.47674 7.17892C9.17174 7.17892 8.92399 6.93117 8.92399 6.62617C8.92399 6.32117 9.17174 6.07342 9.47674 6.07342C9.78174 6.07342 10.0295 6.32117 10.0295 6.62617C10.0295 6.93117 9.78174 7.17892 9.47674 7.17892ZM14.8992 7.17892C14.5942 7.17892 14.3465 6.93117 14.3465 6.62617C14.3465 6.32117 14.5942 6.07342 14.8992 6.07342C15.2042 6.07342 15.452 6.32117 15.452 6.62617C15.452 6.93117 15.2042 7.17892 14.8992 7.17892Z" />
        </svg>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[9px] font-medium uppercase tracking-wide text-white/80">
          Get it on
        </span>
        <span className="block text-[15px] font-semibold tracking-tight">Android</span>
      </span>
    </a>
  );
}

function MasjidlyMarketingHeader() {
  const linkClass =
    "rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2 sm:px-5 sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pb-2">
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="pointer-events-auto flex min-h-[3.25rem] items-center justify-between gap-3 rounded-full border border-neutral-200/90 bg-white/95 px-4 py-2 shadow-[0_8px_28px_-6px_rgb(0_0_0/0.12)] ring-1 ring-black/[0.06] backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:min-h-[3.5rem] sm:gap-4 sm:px-6 sm:py-2.5"
        >
          <Link
            href="/masjidly"
            className="min-w-0 shrink text-lg font-semibold tracking-tight text-[#1a1a1a] transition hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 rounded-lg px-1"
          >
            Masjidly
          </Link>
          <nav
            className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2"
            aria-label="Main navigation"
          >
            <Link href="/" className={linkClass}>
              Sheffield Masjids
            </Link>
            <Link href="/masjidly/terms" className={linkClass}>
              Terms
            </Link>
            <Link href="/masjidly/privacy" className={linkClass}>
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[min(46vw,11.25rem)] shrink-0 sm:w-[min(38vw,12.5rem)] md:w-52 ${className}`}
    >
      <div className="relative rounded-[1.85rem] border border-neutral-200/90 bg-neutral-900 p-[5px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
        <div className="relative overflow-hidden rounded-[1.55rem] bg-white">{children}</div>
      </div>
    </div>
  );
}

function PhoneScreenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="block min-h-[22rem] w-full object-cover object-top sm:min-h-[24rem]"
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Light, centered hero: site header, headline, store CTAs, radial glow, overlapping phone frames.
 */
export default function MasjidlyLandingHero() {
  return (
    <section
      className="relative isolate flex flex-col items-center overflow-hidden bg-transparent pb-8 pt-0 text-center sm:pb-10"
      style={{ fontFamily: "var(--font-sans-local), ui-sans-serif, system-ui, sans-serif" }}
    >
      <MasjidlyMarketingHeader />

      <div
        className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[min(28rem,70vw)] w-[min(56rem,130vw)] -translate-x-1/2 translate-y-[18%] rounded-[100%] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(191,227,255,0.55) 0%, rgba(230,240,255,0.35) 45%, rgba(255,255,255,0) 72%)",
        }}
        aria-hidden
      />

      <div className={`relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 ${MASJIDLY_FLOATING_HEADER_PAD}`}>
        <h1 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight text-[#1a1a1a] sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
          Official Masjid timetables.
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-pretty text-sm leading-relaxed text-[#666666] sm:text-base">
          Generic prayer apps show calculated times; Masjidly uses the official timetables from your local
          mosques.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <AndroidBadge />
          <AppStoreBadge />
        </div>
      </div>

      <div className="relative z-10 mt-10 flex w-full max-w-4xl justify-center px-4 sm:mt-14 md:mt-16">
        <div className="relative flex w-full max-w-[22rem] items-end justify-center sm:max-w-[26rem] md:max-w-[32rem]">
          <PhoneFrame className="absolute left-0 bottom-0 z-0 origin-bottom scale-[0.88] -rotate-[8deg] translate-x-[-8%] sm:translate-x-[-12%] md:scale-90">
            <PhoneScreenshot src="/masjidly/timetable.png" alt="Masjidly timetable view" />
          </PhoneFrame>
          <PhoneFrame className="relative z-10 scale-[1.02] sm:scale-105">
            <PhoneScreenshot src="/masjidly/main.png" alt="Masjidly home screen" />
          </PhoneFrame>
          <PhoneFrame className="absolute right-0 bottom-0 z-0 origin-bottom scale-[0.88] rotate-[8deg] translate-x-[8%] sm:translate-x-[12%] md:scale-90">
            <PhoneScreenshot src="/masjidly/timetable.png" alt="Masjidly timetable view" />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}
