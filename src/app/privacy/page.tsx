import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME}. How we collect, use, and protect your data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#0A1128] via-[#121c38] to-[#1A2642] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/settings"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 rounded text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]"
        >
          <span aria-hidden="true">←</span> Back to settings
        </Link>

        <article className="rounded-2xl border border-white/10 bg-[#101a35]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Privacy Policy
          </h1>

          <div className="mt-6 space-y-6 text-[0.95rem] leading-7 text-slate-200">
            <p>
              {SITE_NAME} provides prayer times and mosque information for Sheffield. This policy explains what data we collect and how we use it.
            </p>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Data We Collect</h2>
              <ul className="list-disc space-y-2 pl-6 marker:text-[#FFB380]">
                <li>
                  <strong className="text-white">Mosque preference</strong> - Stored locally in your browser (localStorage) when you select a mosque. We do not send this to any server.
                </li>
                <li>
                  <strong className="text-white">Location</strong> - Only if you enable it, to show the nearest mosque. Location is processed in your browser and not stored or transmitted to our servers.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Data We Do Not Collect</h2>
              <p>
                We do not collect personal information, account data, or tracking identifiers. No analytics or advertising trackers are used.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Your Rights</h2>
              <p>
                You can clear your mosque preference by clearing site data in your browser. For GDPR, CCPA, or other privacy requests, contact us at{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-medium text-[#FFB380] underline underline-offset-2 hover:text-[#ffd2b3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a35] rounded-sm"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Updates</h2>
              <p>
                We may update this policy. The last update date will be shown at the bottom of this page.
              </p>
            </section>

            <p className="pt-2 text-xs text-slate-400">
              Last updated: March 2026
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
