import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE_NAME} collects and presents mosque prayer and iqamah times for Sheffield.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center text-sm font-bold text-[#FFB380] underline underline-offset-4">
          Back to prayer times
        </Link>
        <article className="rounded-2xl border border-white/10 bg-[#0A1128]/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">About Sheffield Masjids</h1>
          <div className="mt-8 space-y-6 text-base leading-8 text-white/80">
            <p>
              {SITE_NAME} is a community prayer-time directory for Sheffield, United Kingdom. It helps residents and visitors find daily adhan times, mosque-specific iqamah times, Jumu&apos;ah information, monthly timetables, Ramadan schedules, and mosque locations in one place. The service is designed to make published mosque information easier to find without suggesting that every mosque follows the same congregation schedule.
            </p>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">How the timetable works</h2>
              <p>
                Prayer and congregation times are taken from mosque-published sources where available and stored as structured timetable data. The site displays times in the Europe/London timezone and preserves mosque-level differences. Iqamah times can change independently of adhan times, so users should choose the mosque they attend and check the date shown with each result.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">Accuracy and corrections</h2>
              <p>
                The aim is to present faithful copies of published schedules, not to replace a mosque&apos;s own announcements. Committees may make short-notice changes for Ramadan, Eid, weather, building access, or local circumstances. For an important journey or congregation, confirm the time with the mosque. If a timetable, address, or website link is incorrect, send the source and correction through the contact page so it can be checked.
              </p>
            </section>
            <nav aria-label="Related information" className="flex flex-wrap gap-4 pt-2 text-sm font-bold">
              <Link href="/contact" className="text-[#FFB380] underline underline-offset-4">Contact</Link>
              <Link href="/privacy" className="text-[#FFB380] underline underline-offset-4">Privacy policy</Link>
              <Link href="/terms" className="text-[#FFB380] underline underline-offset-4">Terms</Link>
            </nav>
          </div>
        </article>
      </div>
    </AppLayout>
  );
}
