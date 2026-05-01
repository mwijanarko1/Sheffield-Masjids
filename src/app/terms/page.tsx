import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms of use for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
            Terms & Conditions
          </h1>

          <div className="space-y-8 text-base leading-relaxed text-white/80">
            <p className="text-lg text-white font-medium leading-normal">
              By using {SITE_NAME}, you agree to these terms.
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Use of the Service</h2>
              <p>
                {SITE_NAME} provides prayer times and mosque information for reference. Times are sourced from mosque data and may change. Always confirm with your local mosque for accurate prayer and iqamah times.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Accuracy</h2>
              <p>
                We strive for accuracy but do not guarantee that times are correct. Use at your own discretion.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Contact</h2>
              <p>
                For questions about these terms, contact{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-bold text-[var(--theme-accent-countdown)] underline underline-offset-4 hover:text-[var(--theme-accent-countdown-deep)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] rounded"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
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
