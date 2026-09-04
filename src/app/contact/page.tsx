import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
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
      <MasjidlyContentShell title={`Contact ${SITE_NAME}`}>
        <p>
          Contact {SITE_NAME} to report an incorrect prayer time, iqamah time, Jumu&apos;ah time, mosque address, website link, or timetable source. You can also report a technical problem, ask a privacy question, or request a correction to information shown on the site. This contact address is for the directory itself and is not a substitute for contacting an individual mosque about bookings, classes, donations, funerals, or building access.
        </p>
        <section>
          <h2>Email</h2>
          <p>
            Send enquiries to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            . For a timetable correction, include the mosque name, affected date, incorrect value, expected value, and a link or attachment showing the mosque&apos;s published schedule. Clear evidence helps the correction get checked without guessing or recalculating prayer times.
          </p>
        </section>
        <section>
          <h2>Before sending</h2>
          <p>
            If a congregation is about to begin, contact the mosque directly because the directory cannot confirm last-minute announcements. Do not email passwords, payment details, identity documents, precise location history, or other sensitive personal information. Privacy requests should identify the page or browser data involved and describe the action requested. The site does not provide emergency, religious-ruling, or pastoral support.
          </p>
        </section>
        <nav aria-label="Related information">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
