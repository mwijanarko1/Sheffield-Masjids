import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { REPORTABLE_PATHS } from "@/lib/feedback/report-schema";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Report an API problem",
  description: `Report a confusing error, unclear documentation, an unexpected response, or missing published data when using the ${SITE_NAME} prayer-times API.`,
  alternates: { canonical: "/report-api-issue" },
  robots: { index: false, follow: true },
};

const FIELD =
  "mt-1 w-full rounded-md border border-current/30 bg-transparent px-3 py-2 text-base";

export default function ReportApiIssuePage() {
  return (
    <AppLayout>
      <MasjidlyContentShell title="Report an API problem">
        <p>
          Use this form when the {SITE_NAME} prayer-times or calendar API returned something confusing or wrong, or the
          documentation did not explain what to do. It submits to the same endpoint as <code>POST /api/feedback</code>.
          It does not calculate prayer times and a report does not promise a fix. To correct a timetable, send the
          mosque&apos;s published schedule through the <Link href="/contact">contact page</Link>.
        </p>
        <section>
          <h2>Before you send</h2>
          <p>
            Do not include passwords, cookies, API keys, email addresses, or other personal data. Likely secrets are
            redacted before storage. Reports are private, reviewed by a maintainer, and deleted after 90 days. Each
            network may send two reports per hour and five per day, and requests over those limits are rejected.
          </p>
        </section>
        <form method="post" action="/api/feedback" className="space-y-4">
          <input type="hidden" name="schemaVersion" value="1" />
          <label className="block">
            Category
            <select name="category" required className={FIELD} defaultValue="">
              <option value="" disabled>Choose one</option>
              <option value="request_error">Request error</option>
              <option value="documentation">Documentation friction</option>
              <option value="unexpected_response">Unexpected response</option>
              <option value="missing_data">Missing published data</option>
            </select>
          </label>
          <label className="block">
            Summary (up to 200 characters)
            <input name="summary" required maxLength={200} className={FIELD} />
          </label>
          <label className="block">
            Request path
            <select name="requestPath" required className={FIELD} defaultValue="">
              <option value="" disabled>Choose one</option>
              {Object.keys(REPORTABLE_PATHS).map((path) => (
                <option key={path} value={path}>{path}</option>
              ))}
            </select>
          </label>
          <label className="block">
            Request method
            <select name="requestMethod" className={FIELD} defaultValue="GET">
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </select>
          </label>
          <label className="block">
            Query parameters, for example <code>mosque=madina-masjid-sheffield&amp;date=2026-04-10</code>
            <input name="requestQuery" maxLength={400} className={FIELD} />
          </label>
          <label className="block">
            Response status
            <input name="responseStatus" inputMode="numeric" pattern="[1-5][0-9][0-9]" className={FIELD} />
          </label>
          <label className="block">
            Response content type
            <input name="responseContentType" maxLength={100} className={FIELD} />
          </label>
          <label className="block">
            Response body excerpt (up to 500 characters)
            <textarea name="responseBodyExcerpt" maxLength={500} rows={3} className={FIELD} />
          </label>
          <label className="block">
            What you expected
            <textarea name="expected" required maxLength={500} rows={3} className={FIELD} />
          </label>
          <label className="block">
            What happened
            <textarea name="actual" required maxLength={500} rows={3} className={FIELD} />
          </label>
          <label className="block">
            Reproduction steps, one per line (up to 5)
            <textarea name="reproduction" required rows={4} className={FIELD} />
          </label>
          <label className="block">
            Agent or client name (optional)
            <input name="agentName" maxLength={64} className={FIELD} />
          </label>
          <label className="block">
            Agent or client version (optional)
            <input name="agentVersion" maxLength={32} className={FIELD} />
          </label>
          <button type="submit" className="rounded-md border border-current px-4 py-2 font-medium">
            Send report
          </button>
        </form>
        <nav aria-label="Related information">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
