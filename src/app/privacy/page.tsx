import type { Metadata } from "next";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME}. How we collect, use, and protect your data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <AppLayout>
      <MasjidlyContentShell
        title="Privacy Policy"
        backHref="/settings"
        backLabel="Back to settings"
      >
        <p>
          {SITE_NAME} provides prayer times and mosque information for Sheffield. This policy explains what data we collect and how we use it.
        </p>

        <section>
          <h2>Data We Collect</h2>
          <ul className="list-disc space-y-3 pl-6">
            <li>
              <strong>Mosque preference</strong>  -  Stored locally in your browser (localStorage) when you select a mosque. We do not send this to any server.
            </li>
            <li>
              <strong>Display preferences</strong>  -  Theme mode and 24-hour clock preference may also be stored locally in your browser.
            </li>
            <li>
              <strong>Location</strong>  -  Only if you enable it, to show the nearest mosque. Location is processed in your browser and not stored or transmitted to our servers.
            </li>
          </ul>
        </section>

        <section>
          <h2>Analytics</h2>
          <p>
            We use Vercel Analytics to understand how visitors use the site (e.g. page views, referrers). This is privacy-friendly: no personal information or tracking identifiers are collected. Data is aggregated and processed by Vercel.
          </p>
        </section>

        <section>
          <h2>Data We Do Not Collect</h2>
          <p>
            We do not collect personal information, account data, or advertising trackers.
          </p>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>
            You can clear your mosque preference by clearing site data in your browser. For GDPR, CCPA, or other privacy requests, contact us at{" "}
            <a href="mailto:mikhailspeaks@gmail.com">mikhailspeaks@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>Updates</h2>
          <p>
            We may update this policy. The last update date will be shown at the bottom of this page.
          </p>
        </section>

        <p className="pt-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-55">
          Last updated: March 2026
        </p>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
