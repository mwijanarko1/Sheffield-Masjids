import { evaluateAttempt, LONGEST_WINDOW_MS, readFeedbackLimits, type FeedbackLimits } from "./feedbackLimits";

export const FEEDBACK_CATEGORIES = [
  "request_error",
  "documentation",
  "unexpected_response",
  "missing_data",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackReport = {
  schemaVersion: 1;
  category: FeedbackCategory;
  summary: string;
  request: {
    method: "GET" | "HEAD";
    path: string;
    query: Array<{ key: string; value: string }>;
  };
  response?: {
    status: number;
    contentType?: string;
    bodyExcerpt?: string;
  };
  expected: string;
  actual: string;
  reproduction: string[];
  agent?: { name: string; version?: string };
};

export type StoredFeedbackReport = FeedbackReport & {
  status: "received";
  fingerprint: string;
  clientKey: string;
  createdAt: number;
  expiresAt: number;
};

export type IntakeConfig = {
  limits: FeedbackLimits;
  retentionMs: number;
  maxReports: number;
  disabled: boolean;
};

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_REPORTS = 500;
const DISABLED_RETRY_AFTER_SECONDS = 3600;
const PRUNE_BATCH = 20;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readIntakeConfig(env: Record<string, string | undefined>): IntakeConfig {
  return {
    limits: readFeedbackLimits(env),
    retentionMs: positiveInt(env.FEEDBACK_RETENTION_DAYS, DEFAULT_RETENTION_DAYS) * 24 * 60 * 60 * 1000,
    maxReports: positiveInt(env.FEEDBACK_MAX_REPORTS, DEFAULT_MAX_REPORTS),
    disabled: (env.FEEDBACK_INTAKE_DISABLED ?? "").trim().toLowerCase() === "true",
  };
}

/** Storage operations the intake rules need. Convex and the tests each supply one. */
export interface IntakeRepo {
  /** Newest-first attempt timestamps for a scope since `since`, at most `limit`. */
  recentAttempts(scope: string, since: number, limit: number): Promise<number[]>;
  insertAttempts(scopes: string[], at: number): Promise<void>;
  deleteAttemptsBefore(cutoff: number, max: number): Promise<void>;
  /** Number of stored reports, counted up to `cap`. */
  countReports(cap: number): Promise<number>;
  findReportByFingerprint(fingerprint: string, now: number): Promise<string | null>;
  insertReport(report: StoredFeedbackReport): Promise<string>;
  deleteExpiredReports(now: number, max: number): Promise<void>;
  incrementCounter(key: string, now: number): Promise<void>;
}

export type AttemptResult =
  | { allowed: true }
  | { allowed: false; reason: "rate_limited" | "disabled"; retryAfterSeconds: number };

export type SubmitResult =
  | { status: "accepted"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "unavailable"; reason: "disabled" | "storage_full"; retryAfterSeconds: number };

export const GLOBAL_SCOPE = "global";

export function ipScope(clientKey: string): string {
  return `ip:${clientKey}`;
}

/**
 * Charges one attempt to the client and global budgets, or reports when the
 * longest exhausted window reopens. Blocked attempts are not recorded, so a
 * flood cannot extend its own lockout or grow storage.
 */
export async function consumeAttempt(
  repo: IntakeRepo,
  input: { clientKey: string },
  now: number,
  config: IntakeConfig,
): Promise<AttemptResult> {
  if (config.disabled) {
    return { allowed: false, reason: "disabled", retryAfterSeconds: DISABLED_RETRY_AFTER_SECONDS };
  }

  await repo.deleteAttemptsBefore(now - LONGEST_WINDOW_MS, PRUNE_BATCH);

  const since = now - LONGEST_WINDOW_MS;
  const { limits } = config;
  const ipCap = Math.max(limits.ipPerHour, limits.ipPerDay);
  const globalCap = Math.max(limits.globalPerMinute, limits.globalPerDay);
  const scope = ipScope(input.clientKey);
  const [ipTimes, globalTimes] = await Promise.all([
    repo.recentAttempts(scope, since, ipCap),
    repo.recentAttempts(GLOBAL_SCOPE, since, globalCap),
  ]);

  const decision = evaluateAttempt({ now, ipTimes, globalTimes, limits });
  if (!decision.allowed) {
    await repo.incrementCounter("throttled", now);
    return { allowed: false, reason: "rate_limited", retryAfterSeconds: decision.retryAfterSeconds };
  }

  await repo.insertAttempts([GLOBAL_SCOPE, scope], now);
  return { allowed: true };
}

export async function submitReport(
  repo: IntakeRepo,
  input: { report: FeedbackReport; fingerprint: string; clientKey: string },
  now: number,
  config: IntakeConfig,
): Promise<SubmitResult> {
  if (config.disabled) {
    return { status: "unavailable", reason: "disabled", retryAfterSeconds: DISABLED_RETRY_AFTER_SECONDS };
  }

  await repo.deleteExpiredReports(now, PRUNE_BATCH);

  const existing = await repo.findReportByFingerprint(input.fingerprint, now);
  if (existing) {
    await repo.incrementCounter("duplicate", now);
    return { status: "duplicate", id: existing };
  }

  const stored = await repo.countReports(config.maxReports);
  if (stored >= config.maxReports) {
    await repo.incrementCounter("storage_full", now);
    return { status: "unavailable", reason: "storage_full", retryAfterSeconds: DISABLED_RETRY_AFTER_SECONDS };
  }

  const id = await repo.insertReport({
    ...input.report,
    status: "received",
    fingerprint: input.fingerprint,
    clientKey: input.clientKey,
    createdAt: now,
    expiresAt: now + config.retentionMs,
  });
  await repo.incrementCounter("accepted", now);
  return { status: "accepted", id };
}
