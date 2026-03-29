import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import TimetableTabContent from "@/components/TimetableTabContent";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Sheffield Prayer Timetables | Monthly & Ramadan | ${SITE_NAME}`;
const description =
  "Full-month and Ramadan prayer timetables for Sheffield mosques and masjids. Download or view iqamah and salah schedules in UK time.";

export const metadata: Metadata = {
  title: "Sheffield Prayer Timetables",
  description,
  keywords: [
    "Sheffield prayer timetable",
    "Sheffield mosque timetable",
    "Ramadan timetable Sheffield",
    "Sheffield masjid calendar",
  ],
  openGraph: {
    title,
    description,
    url: "/timetable",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  alternates: {
    canonical: "/timetable",
  },
};

export const revalidate = 60;

export default async function TimetablePage() {
  const mosques = await getMosques();

  return (
    <AppLayout>
      <TimetableTabContent mosques={mosques} />
    </AppLayout>
  );
}
