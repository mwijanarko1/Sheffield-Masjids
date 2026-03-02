import type { Metadata } from "next";
import ComparePrayerTimes from "@/components/ComparePrayerTimes";
import AppLayout from "@/components/AppLayout";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Compare Mosques | ${SITE_NAME}`;
const description = "Compare prayer and iqamah times across Sheffield mosques.";

export const metadata: Metadata = {
  title: "Compare Mosques",
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
};

export const revalidate = 60;

export default async function ComparePage() {
  const mosques = await getMosques();

  return (
    <AppLayout activeTab="compare">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8 xl:max-w-7xl">
        <h2 className="mb-4 sm:mb-6 text-base sm:text-lg font-bold text-white">Compare prayer times</h2>
        <ComparePrayerTimes standalone mosques={mosques} />
      </div>
    </AppLayout>
  );
}
