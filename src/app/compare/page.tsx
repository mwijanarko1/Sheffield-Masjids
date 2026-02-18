import type { Metadata } from "next";
import ComparePrayerTimes from "@/components/ComparePrayerTimes";
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

export default function ComparePage() {
  return (
    <main className="min-h-[100dvh] bg-background sm:min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-safe sm:px-6 sm:py-10 lg:px-8 xl:max-w-7xl">
        <h2 className="mb-6 text-lg font-bold text-foreground">Compare prayer times</h2>
        <ComparePrayerTimes standalone />
      </div>
    </main>
  );
}
