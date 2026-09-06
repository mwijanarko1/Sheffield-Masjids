import type { Metadata } from "next";
import AppHomePage from "@/components/AppHomePage";
import WebsiteJsonLd from "@/components/WebsiteJsonLd";
import { getInitialHomePrayerWidgetData } from "@/lib/home-prayer-widget-data";
import { getMosques } from "@/lib/mosques";
import { MOSQUE_NAMES, SITE_NAME } from "@/lib/site";

const homeTitle = `UK Mosque Prayer Times Today | ${SITE_NAME}`;
const homeDescription =
  "Find mosque prayer times and iqamah in Sheffield, across the UK and beyond. Browse by city or mosque for daily adhan times, monthly timetables and addresses.";

export const metadata: Metadata = {
  title: "UK Mosque Prayer Times Today",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
  },
  keywords: [
    "Sheffield prayer times",
    "prayer times in Sheffield",
    "Sheffield mosque prayer times",
    "Sheffield masjid prayer times",
    "prayer times Sheffield",
    "Sheffield salah times",
    ...MOSQUE_NAMES.map((n) => `${n} prayer times`),
  ],
};

export const revalidate = 3600;

export default async function Home() {
  const mosques = await getMosques();
  const initialPrayerWidgetData = await getInitialHomePrayerWidgetData(mosques);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <WebsiteJsonLd countries={[...new Set(mosques.map((mosque) => mosque.countryName))]} />
      <AppHomePage
        mosques={mosques}
        initialPrayerWidgetData={initialPrayerWidgetData}
      />
    </main>
  );
}
