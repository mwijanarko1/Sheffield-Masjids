import type { Metadata } from "next";
import Link from "next/link";
import MasjidlyLayout from "@/components/masjidly/MasjidlyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the Masjidly app. How we collect, use, and protect your data.",
  alternates: { canonical: "/masjidly/privacy" },
};

export default function MasjidlyPrivacyPage() {
  return (
    <MasjidlyLayout>
      <div className="mx-auto max-w-3xl px-6 py-24 sm:px-8 sm:py-32">
        <Link
          href="/masjidly"
          className="mb-10 inline-flex min-h-[44px] items-center gap-2 rounded-lg text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <span aria-hidden className="text-lg">←</span> Back to Masjidly
        </Link>

        <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          {/* Specular top edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl mb-8">
            Privacy Policy
          </h1>

          <div className="space-y-8 text-base leading-relaxed text-white/75">
            <p className="text-lg text-white font-medium leading-normal">
              Masjidly is built with privacy in mind. This policy explains what data the app collects and how it is used.
            </p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Data We Collect</h2>
              <ul className="list-disc space-y-3 pl-6 marker:text-[#47A6FF]">
                <li>
                  <strong className="text-white">Mosque preference</strong> — Stored locally on your device when you select a mosque. This data never leaves your device.
                </li>
                <li>
                  <strong className="text-white">Location</strong> — Only if you enable it, to show the nearest mosque and calculate Qibla direction. Location is processed entirely on your device and is not stored or transmitted to our servers.
                </li>
                <li>
                  <strong className="text-white">Notification preferences</strong> — Stored locally on your device to schedule prayer reminders. Notifications are handled by the operating system; no notification data is sent to our servers.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Analytics</h2>
              <p>
                The Masjidly landing page (this website) uses Vercel Analytics to understand how visitors use the page (e.g. page views, referrers). This is privacy-friendly: no personal information or tracking identifiers are collected. Data is aggregated and processed by Vercel.
              </p>
              <p>
                The Masjidly mobile app itself does not include any analytics or tracking.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Data We Do Not Collect</h2>
              <ul className="list-disc space-y-3 pl-6 marker:text-[#47A6FF]">
                <li>We do not collect personal information such as your name, email, or phone number.</li>
                <li>We do not create user accounts or profiles.</li>
                <li>We do not use advertising trackers or third-party ad networks.</li>
                <li>We do not sell or share any data with third parties.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Third-Party Services</h2>
              <p>
                Masjidly uses Convex as its backend for fetching mosque prayer time data. Convex may process anonymous API requests but does not collect personally identifiable information about you.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Your Rights</h2>
              <p>
                You can clear all locally stored preferences by uninstalling the app or clearing the app's data in your device settings. For GDPR, CCPA, or other privacy requests, contact us at{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-semibold text-[#47A6FF] underline underline-offset-4 hover:text-[#2E8DFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Updates</h2>
              <p>
                We may update this privacy policy. The last update date will be shown at the bottom of this page.
              </p>
            </section>

            <footer className="pt-8 border-t border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Last updated: May 2026
              </p>
            </footer>
          </div>
        </article>
      </div>
    </MasjidlyLayout>
  );
}
