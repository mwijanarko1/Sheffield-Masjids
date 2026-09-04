import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms of use for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <AppLayout>
      <MasjidlyContentShell
        title="Terms & Conditions"
        backHref="/settings"
        backLabel="Back to settings"
      >
        <p>By using {SITE_NAME}, you agree to these terms.</p>

        <section>
          <h2>Use of the Service</h2>
          <p>
            {SITE_NAME} provides prayer times and mosque information for reference. Times are sourced from mosque data and may change. Always confirm with your local mosque for accurate prayer and iqamah times.
          </p>
        </section>

        <section>
          <h2>Accuracy</h2>
          <p>
            We strive for accuracy but do not guarantee that times are correct. Use at your own discretion.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions about these terms, contact{" "}
            <a href="mailto:mikhailspeaks@gmail.com">mikhailspeaks@gmail.com</a>.
          </p>
        </section>

        <p className="pt-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-55">
          Last updated: March 2026
        </p>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
