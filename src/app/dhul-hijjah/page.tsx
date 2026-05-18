import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import DhulHijjahContent from "@/components/DhulHijjahContent";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Dhul Hijjah 10 Days Tracker | ${SITE_NAME}`;
const description =
  "Track the blessed 10 days of Dhul Hijjah. Live progress bar showing how much of these special days has passed, based on your local mosque's maghrib times.";

export const metadata: Metadata = {
  title: "Dhul Hijjah 10 Days Tracker",
  description,
  keywords: [
    "Dhul Hijjah",
    "10 days of Dhul Hijjah",
    "Islamic calendar",
    "Hajj",
    "Sheffield mosque",
  ],
  openGraph: {
    title,
    description,
    url: "/dhul-hijjah",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  alternates: {
    canonical: "/dhul-hijjah",
  },
};

export const revalidate = 60;

export default async function DhulHijjahPage() {
  const mosques = await getMosques();

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8 xl:max-w-7xl">
        <DhulHijjahContent mosques={mosques} />
      </div>
    </AppLayout>
  );
}
