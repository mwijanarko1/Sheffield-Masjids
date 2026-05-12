import type { Metadata } from "next";
import Link from "next/link";
import MasjidlyLayout from "@/components/masjidly/MasjidlyLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms of use for the Masjidly app.",
  alternates: { canonical: "/masjidly/terms" },
};

export default function MasjidlyTermsPage() {
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
            Terms & Conditions
          </h1>

          <div className="space-y-8 text-base leading-relaxed text-white/75">
            <p className="text-lg text-white font-medium leading-normal">
              By using Masjidly, you agree to these terms.
            </p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Use of the Service</h2>
              <p>
                Masjidly provides official mosque prayer times and related features for personal, non-commercial reference. The app displays adhan and iqamah times sourced directly from participating mosques. You may not reverse-engineer, redistribute, or commercially exploit the app or its data without written permission.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Accuracy</h2>
              <p>
                We strive for accuracy but do not guarantee that prayer times are correct at all times. Mosque timetables may change without notice. Always confirm with your local mosque for the most accurate prayer and iqamah times.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Intellectual Property</h2>
              <p>
                All content, design, code, and branding within Masjidly are proprietary and protected by copyright and other intellectual property laws. The Masjidly name, logo, and visual identity may not be used without permission.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Limitation of Liability</h2>
              <p>
                Masjidly is provided "as is" without warranties of any kind. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the app or reliance on its prayer time data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Changes to Terms</h2>
              <p>
                We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the revised terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white tracking-tight">Contact</h2>
              <p>
                For questions about these terms, contact{" "}
                <a
                  href="mailto:mikhailspeaks@gmail.com"
                  className="font-semibold text-[#47A6FF] underline underline-offset-4 hover:text-[#2E8DFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                >
                  mikhailspeaks@gmail.com
                </a>
                .
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
