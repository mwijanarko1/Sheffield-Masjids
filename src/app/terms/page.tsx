import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms of use for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
            Terms & Conditions
          </h1>

          <div className="mt-6 space-y-6 text-[0.95rem] leading-7 text-slate-200">
            <p>
              By using {SITE_NAME}, you agree to these terms.
            </p>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Use of the Service</h2>
              <p>
                {SITE_NAME} provides prayer times and mosque information for reference. Times are sourced from mosque data and may change. Always confirm with your local mosque for accurate prayer and iqamah times.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Accuracy</h2>
              <p>
                We strive for accuracy but do not guarantee that times are correct. Use at your own discretion.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p>
                For questions about these terms, contact{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-medium text-[#FFB380] underline underline-offset-2 hover:text-[#ffd2b3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a35] rounded-sm"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
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
