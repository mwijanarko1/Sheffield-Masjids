import type { Metadata } from "next";
import AppHomePage from "@/components/AppHomePage";
import { getMosques } from "@/lib/mosques";
import { MOSQUE_NAMES, SITE_NAME } from "@/lib/site";

const homeTitle = `Sheffield Mosque Prayer Times | ${SITE_NAME}`;
const homeDescription =
  "Prayer times and iqamah times for all Sheffield mosques including Madina Masjid, Sheffield Grand Mosque, Al-Huda Academy, Masjid Sunnah, and more. Daily timetables, monthly schedules, and Ramadan times.";

export const metadata: Metadata = {
  title: "Sheffield Mosque Prayer Times",
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
    "Sheffield mosque prayer times",
    "Sheffield masjid prayer times",
    "prayer times Sheffield",
    ...MOSQUE_NAMES.map((n) => `${n} prayer times`),
  ],
};

export const revalidate = 60;

export default async function Home() {
  const mosques = await getMosques();

  return (
    <main className="relative h-[100dvh] min-h-[100svh] w-full overflow-hidden">
      <AppHomePage mosques={mosques} />
    </main>
  );
}
