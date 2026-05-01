import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME}. How we collect, use, and protect your data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/settings"
          className="mb-8 inline-flex min-h-[44px] items-center gap-2 rounded-lg text-sm font-black uppercase tracking-widest text-[var(--theme-text-muted)] hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]"
        >
          <span aria-hidden="true" className="text-lg">←</span> Back to settings
        </Link>

        <article className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,17,40,0.25)] p-6 shadow-2xl backdrop-blur-[20px] saturate-[180%] sm:p-10">
          {/* Specular top edge shimmer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl mb-8">
            Privacy Policy
          </h1>

          <div className="space-y-8 text-base leading-relaxed text-white/80">
            <p className="text-lg text-white font-medium leading-normal">
              {SITE_NAME} provides prayer times and mosque information for Sheffield. This policy explains what data we collect and how we use it.
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Data We Collect</h2>
              <ul className="list-disc space-y-3 pl-6 marker:text-[var(--theme-accent-countdown)]">
                <li>
                  <strong className="text-white">Mosque preference</strong> — Stored locally in your browser (localStorage) when you select a mosque. We do not send this to any server.
                </li>
                <li>
                  <strong className="text-white">Location</strong> — Only if you enable it, to show the nearest mosque. Location is processed in your browser and not stored or transmitted to our servers.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Analytics</h2>
              <p>
                We use Vercel Analytics to understand how visitors use the site (e.g. page views, referrers). This is privacy-friendly: no personal information or tracking identifiers are collected. Data is aggregated and processed by Vercel.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Data We Do Not Collect</h2>
              <p>
                We do not collect personal information, account data, or advertising trackers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Your Rights</h2>
              <p>
                You can clear your mosque preference by clearing site data in your browser. For GDPR, CCPA, or other privacy requests, contact us at{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-bold text-[var(--theme-accent-countdown)] underline underline-offset-4 hover:text-[var(--theme-accent-countdown-deep)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] rounded"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Updates</h2>
              <p>
                We may update this policy. The last update date will be shown at the bottom of this page.
              </p>
            </section>

            <footer className="pt-8 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
                Last updated: March 2026
              </p>
            </footer>
          </div>
        </article>
      </div>
    </AppLayout>
  );
}
