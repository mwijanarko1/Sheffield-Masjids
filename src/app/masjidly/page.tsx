import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MasjidlyLayout from "@/components/masjidly/MasjidlyLayout";
import FeatureCard from "@/components/masjidly/FeatureCard";
import { getMosques } from "@/lib/mosques";
import { getDefaultHomeMosque } from "@/lib/home-prayer-defaults";
import { getPrayerTimesForDate } from "@/lib/prayer-times";
import type { DailyPrayerTimes } from "@/types/prayer-times";
import {
  Bell,
  CalendarDays,
  Clock,
  Compass,
  Globe,
  Landmark,
  LayoutTemplate,
  Moon,
  Sun,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Masjidly — Official Mosque Prayer Times",
  description:
    "A beautifully designed, time-adaptive prayer times app that displays official mosque timetables with an immersive, atmospheric interface.",
  alternates: { canonical: "/masjidly" },
  openGraph: {
    title: "Masjidly — Official Mosque Prayer Times",
    description:
      "Accurate adhan and iqamah times sourced directly from participating mosques. Time-adaptive atmosphere, local notifications, Qibla compass, and more.",
    url: "/masjidly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Masjidly — Official Mosque Prayer Times",
    description:
      "Accurate adhan and iqamah times sourced directly from participating mosques.",
  },
};

const FEATURES = [
  {
    icon: Landmark,
    title: "Official Prayer Times",
    description:
      "Accurate adhan and iqamah times sourced directly from participating mosques.",
  },
  {
    icon: Sun,
    title: "Time-Adaptive Atmosphere",
    description:
      "Full-bleed gradients that shift throughout the day — from deep pre-dawn blues to vivid sunset purples.",
  },
  {
    icon: Clock,
    title: "Next Prayer Countdown",
    description:
      "Live countdown to the next adhan or iqamah with smart DST handling.",
  },
  {
    icon: CalendarDays,
    title: "Monthly Timetable",
    description:
      "Complete month view with prayer times, iqamah ranges, and Ramadan overrides.",
  },
  {
    icon: Bell,
    title: "Local Notifications",
    description:
      "Customizable prayer reminders with adhan sound, snooze, and quick actions.",
  },
  {
    icon: Compass,
    title: "Qibla Direction",
    description:
      "Compass-based Qibla indicator using device heading and location.",
  },
  {
    icon: LayoutTemplate,
    title: "Home Screen Widgets",
    description:
      "iOS widgets showing today's prayer times at a glance.",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "English, Arabic, and Urdu with RTL layout support.",
  },
  {
    icon: Moon,
    title: "Mosque Selection",
    description:
      "Choose from a curated list of local mosques with persistent selection.",
  },
];

export default async function MasjidlyLandingPage() {
  let prayerTimes: DailyPrayerTimes | null = null;

  try {
    const mosques = await getMosques();
    const mosque = getDefaultHomeMosque(mosques);
    if (mosque) {
      const today = new Date();
      prayerTimes = await getPrayerTimesForDate(mosque.slug, today);
    }
  } catch {
    // Fallback to null — gradient will use estimated times
  }

  return (
    <MasjidlyLayout prayerTimes={prayerTimes}>
      {/* ─── Hero ─── */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl">
          {/* App icon */}
          <div className="mx-auto mb-8 h-24 w-24 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden">
            <Image
              src="/masjidly/app-icon.png"
              alt="Masjidly app icon"
              width={96}
              height={96}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <h1 className="text-5xl font-light tracking-tight text-white sm:text-7xl mb-4">
            Masjidly
          </h1>

          <p className="text-xl font-medium tracking-wide text-white/90 mb-3">
            Official Mosque Prayer Times
          </p>

          <p className="text-base leading-relaxed text-white/70 max-w-lg mx-auto mb-10">
            A beautifully designed, time-adaptive prayer times app that displays
            official mosque timetables with an immersive, atmospheric interface.
          </p>

          {/* Download CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* App Store */}
            <a
              href="#"
              className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  Download on the
                </div>
                <div className="text-lg font-bold tracking-tight">
                  App Store
                </div>
              </div>
            </a>

            {/* Android APK */}
            <a
              href="#"
              className="inline-flex items-center gap-3 rounded-full bg-[#3DDC84] px-8 py-4 text-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3DDC84]/50"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M17.523 15.3414C17.523 15.6414 17.2805 15.8839 16.9805 15.8839H16.3992V18.1402C16.3992 18.8077 15.8555 19.3514 15.188 19.3514C14.5205 19.3514 13.9767 18.8077 13.9767 18.1402V15.8839H9.99924V18.1402C9.99924 18.8077 9.45549 19.3514 8.78799 19.3514C8.12049 19.3514 7.57674 18.8077 7.57674 18.1402V15.8839H6.99549C6.69549 15.8839 6.45299 15.6414 6.45299 15.3414V8.23267H17.523V15.3414ZM4.99924 8.23267C4.33174 8.23267 3.78799 8.77642 3.78799 9.44392V14.1302C3.78799 14.7977 4.33174 15.3414 4.99924 15.3414C5.66674 15.3414 6.21049 14.7977 6.21049 14.1302V9.44392C6.21049 8.77642 5.66674 8.23267 4.99924 8.23267ZM19.0267 8.23267C18.3592 8.23267 17.8155 8.77642 17.8155 9.44392V14.1302C17.8155 14.7977 18.3592 15.3414 19.0267 15.3414C19.6942 15.3414 20.238 14.7977 20.238 14.1302V9.44392C20.238 8.77642 19.6942 8.23267 19.0267 8.23267ZM15.3042 4.52392L16.3517 2.72642C16.4292 2.59142 16.3867 2.42017 16.2517 2.34267C16.1167 2.26517 15.9455 2.30767 15.868 2.44267L14.8017 4.27267C13.9992 3.94767 13.118 3.76642 12.188 3.76642C11.258 3.76642 10.3767 3.94767 9.57424 4.27267L8.50799 2.44267C8.43049 2.30767 8.25924 2.26517 8.12424 2.34267C7.98924 2.42017 7.94674 2.59142 8.02424 2.72642L9.07174 4.52392C7.29399 5.42392 6.11674 7.23642 6.11674 9.31892H18.2592C18.2592 7.23642 17.082 5.42392 15.3042 4.52392ZM9.47674 7.17892C9.17174 7.17892 8.92399 6.93117 8.92399 6.62617C8.92399 6.32117 9.17174 6.07342 9.47674 6.07342C9.78174 6.07342 10.0295 6.32117 10.0295 6.62617C10.0295 6.93117 9.78174 7.17892 9.47674 7.17892ZM14.8992 7.17892C14.5942 7.17892 14.3465 6.93117 14.3465 6.62617C14.3465 6.32117 14.5942 6.07342 14.8992 6.07342C15.2042 6.07342 15.452 6.32117 15.452 6.62617C15.452 6.93117 15.2042 7.17892 14.8992 7.17892Z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  Download
                </div>
                <div className="text-lg font-bold tracking-tight">
                  Android APK
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
          <div className="h-8 w-5 rounded-full border border-white/20 flex justify-center pt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl mb-3">
              Features
            </h2>
            <p className="text-base text-white/60 max-w-md mx-auto">
              Everything you need for your daily prayers, beautifully crafted.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative border-t border-white/10 px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Masjidly. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              Built by{" "}
              <a
                href="https://mikhailwijanarko.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors underline underline-offset-2"
              >
                @mikhailbuilds
              </a>
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
            <Link
              href="/masjidly/terms"
              className="text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Terms
            </Link>
            <Link
              href="/masjidly/privacy"
              className="text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Privacy
            </Link>
            <Link
              href="/"
              className="text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            >
              Sheffield Masjids
            </Link>
          </nav>
        </div>
      </footer>
    </MasjidlyLayout>
  );
}
