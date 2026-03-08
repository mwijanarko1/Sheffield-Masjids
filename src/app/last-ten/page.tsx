import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import LastTenNightsPage from "@/components/LastTenNightsPage";
import { SITE_NAME } from "@/lib/site";

const title = `Ramadan Checklist | ${SITE_NAME}`;
const description =
  "Track a nightly Ramadan checklist with adhkar, duas, and progress saved in your browser.";

export const metadata: Metadata = {
  title: "Ramadan Checklist",
  description,
  alternates: {
    canonical: "/last-ten",
  },
  openGraph: {
    title,
    description,
    url: "/last-ten",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function LastTenPage() {
  return (
    <AppLayout>
      <LastTenNightsPage />
    </AppLayout>
  );
}
