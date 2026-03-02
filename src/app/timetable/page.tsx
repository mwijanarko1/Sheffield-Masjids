import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import TimetableTabContent from "@/components/TimetableTabContent";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Timetable | ${SITE_NAME}`;
const description = "View full month and Ramadan prayer timetables for your mosque.";

export const metadata: Metadata = {
  title: "Timetable",
  description,
  alternates: {
    canonical: "/timetable",
  },
};

export const revalidate = 60;

export default async function TimetablePage() {
  const mosques = await getMosques();

  return (
    <AppLayout activeTab="timetable">
      <TimetableTabContent mosques={mosques} />
    </AppLayout>
  );
}
