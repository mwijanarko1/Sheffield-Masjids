import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE_NAME} collects and presents mosque prayer and iqamah times for Sheffield.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <AppLayout>
      <MasjidlyContentShell title={`About ${SITE_NAME}`}>
        <p>
          {SITE_NAME} is a community prayer-time directory for Sheffield, United Kingdom. It helps residents and visitors find daily adhan times, mosque-specific iqamah times, Jumu&apos;ah information, monthly timetables, Ramadan schedules, and mosque locations in one place. The service is designed to make published mosque information easier to find without suggesting that every mosque follows the same congregation schedule.
        </p>
        <section>
          <h2>How the timetable works</h2>
          <p>
            Prayer and congregation times are taken from mosque-published sources where available and stored as structured timetable data. The site displays times in the Europe/London timezone and preserves mosque-level differences. Iqamah times can change independently of adhan times, so users should choose the mosque they attend and check the date shown with each result.
          </p>
        </section>
        <section>
          <h2>Accuracy and corrections</h2>
          <p>
            The aim is to present faithful copies of published schedules, not to replace a mosque&apos;s own announcements. Committees may make short-notice changes for Ramadan, Eid, weather, building access, or local circumstances. For an important journey or congregation, confirm the time with the mosque. If a timetable, address, or website link is incorrect, send the source and correction through the contact page so it can be checked.
          </p>
        </section>
        <nav aria-label="Related information">
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/masjidly">Masjidly app</Link>
        </nav>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
