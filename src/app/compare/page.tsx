import type { Metadata } from "next";
import ComparePrayerTimes from "@/components/ComparePrayerTimes";
import AppLayout from "@/components/AppLayout";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Compare Sheffield Mosque Prayer Times | ${SITE_NAME}`;
const description =
  "Compare prayer times and iqamah times across all Sheffield mosques. Madina Masjid, Sheffield Grand Mosque, Al-Huda Academy, and more.";

export const metadata: Metadata = {
  title: "Compare Sheffield Mosque Prayer Times",
  description,
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title,
    description,
    url: "/compare",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  keywords: [
    "compare Sheffield mosque prayer times",
    "Sheffield mosque prayer times comparison",
    "Sheffield masjid iqamah times",
  ],
};

export const revalidate = 60;

export default async function ComparePage() {
  const mosques = await getMosques();

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8 xl:max-w-7xl">
        <ComparePrayerTimes standalone mosques={mosques} />
      </div>
    </AppLayout>
  );
}
