import type {
  AttemptResult,
  FeedbackReport,
  SubmitResult,
} from "../../../convex/lib/feedbackIntake";
import { BodyTooLargeError, MAX_BODY_BYTES, readBoundedBody } from "./body";
import { clientKey, verifiedClientIdentity } from "./client-identity";
import { parseFeedbackReport, reportFingerprint, reportFromForm, type JsonValue } from "./report-schema";

/** What intake needs from durable shared storage. Convex in production. */
export interface FeedbackStore {
  consumeAttempt(clientKey: string): Promise<AttemptResult>;
  submit(input: { report: FeedbackReport; fingerprint: string; clientKey: string }): Promise<SubmitResult>;
  recordRejection(reason: string): Promise<void>;
}

type Env = Record<string, string | undefined>;

export type IntakeDeps = {
  store: FeedbackStore | null;
  env: Env;
  now?: () => number;
};

export const RETENTION_NOTE =
  "Reports are private, reviewed by a maintainer, and deleted after 90 days.";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const UNAVAILABLE_RETRY_SECONDS = 300;

type Failure = {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
  issues?: Array<{ field: string; message: string }>;
};

type FailureBody = {
  error: string;
  code: string;
  retryAfterSeconds?: number;
  guidance?: string;
  issues?: Failure["issues"];
};

function wantsHtml(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.toLowerCase().startsWith("application/x-www-form-urlencoded") &&
    (request.headers.get("accept") ?? "").includes("text/html")
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function htmlPage(title: string, lines: string[], status: number, headers: Headers): Response {
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><main style="font-family:system-ui;max-width:40rem;margin:3rem auto;padding:0 1rem"><h1>${escapeHtml(title)}</h1>${lines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")}<p><a href="/report-api-issue">Back to the reporting form</a></p></main></html>`;
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, { status, headers });
}

function failureResponse(request: Request, failure: Failure): Response {
  const headers = new Headers(NO_STORE);
  if (failure.retryAfterSeconds !== undefined) headers.set("Retry-After", String(failure.retryAfterSeconds));

  if (wantsHtml(request)) {
    const lines = [failure.message];
    for (const issue of failure.issues ?? []) lines.push(`${issue.field}: ${issue.message}`);
    if (failure.retryAfterSeconds !== undefined) {
      lines.push(`Do not retry for ${failure.retryAfterSeconds} seconds.`);
    }
    return htmlPage("Report not accepted", lines, failure.status, headers);
  }

  const body: FailureBody = { error: failure.message, code: failure.code };
  if (failure.retryAfterSeconds !== undefined) {
    body.retryAfterSeconds = failure.retryAfterSeconds;
    body.guidance = "Do not retry before Retry-After elapses and do not resubmit the same failure repeatedly.";
  }
  if (failure.issues) body.issues = failure.issues;
  return Response.json(body, { status: failure.status, headers });
}

// Bounded so a flood of bad requests cannot create unbounded log volume.
let logWindowStart = 0;
let logCount = 0;
function logRejection(code: string, now: number): void {
  if (now - logWindowStart > 60_000) {
    logWindowStart = now;
    logCount = 0;
  }
  logCount += 1;
  if (logCount <= 10) console.warn(`feedback intake rejected: ${code}`);
}

async function record(store: FeedbackStore, reason: string): Promise<void> {
  try {
    await store.recordRejection(reason);
  } catch {
    // Counters are best effort. The rejection itself already stands.
  }
}

export async function handleFeedbackSubmission(request: Request, deps: IntakeDeps): Promise<Response> {
  const now = (deps.now ?? Date.now)();
  const { store, env } = deps;

  if ((env.FEEDBACK_INTAKE_DISABLED ?? "").trim().toLowerCase() === "true") {
    return failureResponse(request, {
      status: 503,
      code: "intake_disabled",
      message: "Feedback intake is temporarily disabled.",
      retryAfterSeconds: 3600,
    });
  }

  const salt = (env.FEEDBACK_HASH_SALT ?? env.FEEDBACK_INTAKE_SECRET ?? "").trim();
  if (!store || !salt) {
    return failureResponse(request, {
      status: 503,
      code: "intake_unavailable",
      message: "Feedback intake is not available.",
      retryAfterSeconds: UNAVAILABLE_RETRY_SECONDS,
    });
  }

  const key = clientKey(verifiedClientIdentity(request.headers, env), salt);

  // The shared budget is charged before the body is read or parsed, so malformed
  // and oversized requests count and throttled ones never reach persistence.
  let attempt: AttemptResult;
  try {
    attempt = await store.consumeAttempt(key);
  } catch {
    logRejection("limiter_unavailable", now);
    return failureResponse(request, {
      status: 503,
      code: "limiter_unavailable",
      message: "Feedback intake is temporarily unavailable.",
      retryAfterSeconds: UNAVAILABLE_RETRY_SECONDS,
    });
  }
  if (!attempt.allowed) {
    logRejection(attempt.reason, now);
    return attempt.reason === "disabled"
      ? failureResponse(request, {
          status: 503,
          code: "intake_disabled",
          message: "Feedback intake is temporarily disabled.",
          retryAfterSeconds: attempt.retryAfterSeconds,
        })
      : failureResponse(request, {
          status: 429,
          code: "rate_limited",
          message: "Too many feedback submissions. Try again later.",
          retryAfterSeconds: attempt.retryAfterSeconds,
        });
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  const isJson = contentType.startsWith("application/json");
  const isForm = contentType.startsWith("application/x-www-form-urlencoded");
  if (!isJson && !isForm) {
    await record(store, "unsupported_media_type");
    return failureResponse(request, {
      status: 415,
      code: "unsupported_media_type",
      message: "Use Content-Type application/json or application/x-www-form-urlencoded.",
    });
  }

  let raw: string;
  try {
    raw = await readBoundedBody(request, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof BodyTooLargeError;
    await record(store, tooLarge ? "body_too_large" : "unreadable_body");
    return failureResponse(request, tooLarge
      ? { status: 413, code: "body_too_large", message: `Body must be at most ${MAX_BODY_BYTES} bytes.` }
      : { status: 400, code: "invalid_body", message: "Body must be valid UTF-8." });
  }

  let candidate: JsonValue;
  if (isForm) {
    candidate = reportFromForm(new URLSearchParams(raw));
  } else {
    try {
      candidate = JSON.parse(raw);
    } catch {
      await record(store, "invalid_json");
      return failureResponse(request, {
        status: 400,
        code: "invalid_json",
        message: "Body must be valid JSON.",
      });
    }
  }

  const parsed = parseFeedbackReport(candidate);
  if (!parsed.ok) {
    await record(store, "invalid_report");
    return failureResponse(request, {
      status: 422,
      code: "invalid_report",
      message: "Report does not match schema version 1. See GET /api/feedback for the contract.",
      issues: parsed.issues,
    });
  }

  let result: SubmitResult;
  try {
    result = await store.submit({
      report: parsed.report,
      fingerprint: reportFingerprint(parsed.report),
      clientKey: key,
    });
  } catch {
    logRejection("submit_failed", now);
    return failureResponse(request, {
      status: 503,
      code: "intake_unavailable",
      message: "Feedback intake is temporarily unavailable.",
      retryAfterSeconds: UNAVAILABLE_RETRY_SECONDS,
    });
  }

  if (result.status === "unavailable") {
    logRejection(result.reason, now);
    return failureResponse(request, {
      status: 503,
      code: result.reason === "storage_full" ? "storage_full" : "intake_disabled",
      message:
        result.reason === "storage_full"
          ? "Feedback storage is full. Reports are not being queued."
          : "Feedback intake is temporarily disabled.",
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }

  const duplicate = result.status === "duplicate";
  const message = duplicate
    ? "An equivalent report was already received. No new report was created."
    : "Report received. Receipt confirms intake only; it is not a reproduction or a promise of a fix.";

  if (wantsHtml(request)) {
    return htmlPage(
      "Report received",
      [message, `Report ID: ${result.id}`, RETENTION_NOTE],
      202,
      new Headers(NO_STORE),
    );
  }

  return Response.json(
    {
      id: result.id,
      status: "received",
      duplicate,
      message,
      retention: RETENTION_NOTE,
    },
    { status: 202, headers: NO_STORE },
  );
}
