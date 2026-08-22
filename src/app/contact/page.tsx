import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { SITE_NAME } from "@/lib/site";

const CONTACT_EMAIL = "mikhailspeaks@gmail.com";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE_NAME} about timetable corrections, mosque details, privacy, or technical problems.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center text-sm font-bold text-[#FFB380] underline underline-offset-4">
          Back to prayer times
        </Link>
        <article className="rounded-2xl border border-white/10 bg-[#0A1128]/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Contact Sheffield Masjids</h1>
          <div className="mt-8 space-y-6 text-base leading-8 text-white/80">
            <p>
              Contact {SITE_NAME} to report an incorrect prayer time, iqamah time, Jumu&apos;ah time, mosque address, website link, or timetable source. You can also report a technical problem, ask a privacy question, or request a correction to information shown on the site. This contact address is for the directory itself and is not a substitute for contacting an individual mosque about bookings, classes, donations, funerals, or building access.
            </p>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">Email</h2>
              <p>
                Send enquiries to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#FFB380] underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                . For a timetable correction, include the mosque name, affected date, incorrect value, expected value, and a link or attachment showing the mosque&apos;s published schedule. Clear evidence helps the correction get checked without guessing or recalculating prayer times.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">Before sending</h2>
              <p>
                If a congregation is about to begin, contact the mosque directly because the directory cannot confirm last-minute announcements. Do not email passwords, payment details, identity documents, precise location history, or other sensitive personal information. Privacy requests should identify the page or browser data involved and describe the action requested. The site does not provide emergency, religious-ruling, or pastoral support.
              </p>
            </section>
            <nav aria-label="Related information" className="flex flex-wrap gap-4 pt-2 text-sm font-bold">
              <Link href="/about" className="text-[#FFB380] underline underline-offset-4">About</Link>
              <Link href="/privacy" className="text-[#FFB380] underline underline-offset-4">Privacy policy</Link>
              <Link href="/terms" className="text-[#FFB380] underline underline-offset-4">Terms</Link>
            </nav>
          </div>
        </article>
      </div>
    </AppLayout>
  );
}
