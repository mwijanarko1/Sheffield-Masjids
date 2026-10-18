import { FEEDBACK_CATEGORIES } from "../../../convex/lib/feedbackIntake";
import { MAX_BODY_BYTES } from "./body";
import { REPORTABLE_PATHS, REPORT_SCHEMA_VERSION } from "./report-schema";

/** Additive metadata attached to API error bodies so agents can find the channel. */
export const REPORTING_HINT = {
  endpoint: "/api/feedback",
  form: "/report-api-issue",
  docs: "/llms.txt",
} as const;

export function withReportingHint<T extends object>(body: T): T & { report: typeof REPORTING_HINT } {
  return { ...body, report: REPORTING_HINT };
}

/** Machine-readable contract served by GET /api/feedback. */
export function feedbackContract() {
  return {
    purpose:
      "Report friction using the Sheffield Masjids prayer-times API: a confusing error, unclear documentation, an unexpected response, or unavailable published data. This channel does not calculate prayer times and does not promise a fix.",
    submit: {
      method: "POST",
      path: "/api/feedback",
      contentTypes: ["application/json", "application/x-www-form-urlencoded"],
      maxBodyBytes: MAX_BODY_BYTES,
      form: "/report-api-issue",
    },
    schemaVersion: REPORT_SCHEMA_VERSION,
    fields: {
      schemaVersion: `required, must be ${REPORT_SCHEMA_VERSION}`,
      category: `required, one of ${FEEDBACK_CATEGORIES.join(", ")}`,
      summary: "required, 1 to 200 characters",
      request: "required, { method: GET|HEAD, path, query }",
      response: "optional, { status: 100-599, contentType?, bodyExcerpt? (500 characters) }",
      expected: "required, up to 500 characters",
      actual: "required, up to 500 characters",
      reproduction: "required, 1 to 5 steps of up to 200 characters",
      agent: "optional self-reported { name, version? }, not authentication",
    },
    reportablePaths: REPORTABLE_PATHS,
    example: {
      schemaVersion: REPORT_SCHEMA_VERSION,
      category: "documentation",
      summary: "Agent could not discover the supported date format",
      request: {
        method: "GET",
        path: "/api/prayer-times",
        query: { mosque: "madina-masjid-sheffield", date: "10/04/2026" },
      },
      response: { status: 400, contentType: "application/json", bodyExcerpt: "Date must be a valid YYYY-MM-DD value." },
      expected: "Discover the YYYY-MM-DD format before making the request",
      actual: "The request used an unsupported date format",
      reproduction: ["Request /api/prayer-times with date=10/04/2026"],
      agent: { name: "example-client", version: "1.0" },
    },
    receipt: "202 with { id, status: 'received', duplicate, message, retention }. Receipt means received only.",
    errors: {
      400: "invalid_json or invalid_body",
      413: "body_too_large",
      415: "unsupported_media_type",
      422: "invalid_report, with an issues list of { field, message }",
      429: "rate_limited, with Retry-After",
      503: "intake_disabled, limiter_unavailable, intake_unavailable or storage_full, with Retry-After",
    },
    limits: {
      perClient: "2 submissions per hour and 5 per 24 hours, including malformed requests",
      global: "10 per minute and 100 per 24 hours across all clients",
      guidance: "Honour Retry-After. Do not repeat the same failure report.",
    },
    privacy:
      "Do not include credentials, cookies, personal data or full transcripts. Likely secrets are redacted before storage. Reports are private and deleted after 90 days.",
  };
}
