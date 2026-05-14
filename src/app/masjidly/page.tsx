import type { Metadata } from "next";
import MasjidlyLayout from "@/components/masjidly/MasjidlyLayout";
import MasjidlyLandingHero from "@/components/masjidly/MasjidlyLandingHero";
import { getMosques } from "@/lib/mosques";
import { getDefaultHomeMosque } from "@/lib/home-prayer-defaults";
import { getPrayerTimesForDate } from "@/lib/prayer-times";
import type { DailyPrayerTimes } from "@/types/prayer-times";

export const metadata: Metadata = {
  title: "Masjidly — Official Mosque Prayer Times",
  description:
    "English-language app for official Sheffield mosque timetables: live adhan and iqamah countdown, full-month and Ramadan views, UK DST handling, optional reminders, Qibla, widgets, and offline-friendly caching. iOS on the App Store; Android via APK.",
  alternates: { canonical: "/masjidly" },
  openGraph: {
    title: "Masjidly — Official Mosque Prayer Times",
    description:
      "Adhan and iqamah from participating mosques via Convex, with a time-of-day themed home screen, timetable, Ramadan mode, local notifications, Qibla, and widgets on iOS. English UI; iOS App Store and Android APK.",
    url: "/masjidly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Masjidly — Official Mosque Prayer Times",
    description:
      "Official mosque adhan and iqamah — countdown, timetable, Ramadan, DST, reminders, Qibla, and widgets. English UI; App Store and Android APK.",
  },
};

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
      <div className="relative z-10 bg-white text-neutral-900">
        <MasjidlyLandingHero />
      </div>
    </MasjidlyLayout>
  );
}
