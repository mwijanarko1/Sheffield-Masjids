import type { Metadata } from "next";
import AppHomePage from "@/components/AppHomePage";
import WebsiteJsonLd from "@/components/WebsiteJsonLd";
import { getMosques } from "@/lib/mosques";
import { MOSQUE_NAMES, SITE_NAME } from "@/lib/site";

const homeTitle = `Sheffield Prayer Times Today | Adhan & Iqamah | ${SITE_NAME}`;
const homeDescription =
  "Find Sheffield prayer times today: adhan and iqamah for every major mosque and masjid. Madina Masjid, Sheffield Grand Mosque, Al-Huda Academy, Masjid Sunnah, and more — daily, monthly, and Ramadan timetables in UK time.";

export const metadata: Metadata = {
  title: "Sheffield Prayer Times Today",
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

export const revalidate = 60;

export default async function Home() {
  const mosques = await getMosques();

  return (
    <main className="relative h-[100dvh] min-h-[100svh] w-full overflow-hidden">
      <WebsiteJsonLd />
      <AppHomePage mosques={mosques} />
    </main>
  );
}
