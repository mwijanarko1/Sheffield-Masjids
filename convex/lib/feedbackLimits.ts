const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type FeedbackLimits = {
  ipPerHour: number;
  ipPerDay: number;
  globalPerMinute: number;
  globalPerDay: number;
};

export const DEFAULT_FEEDBACK_LIMITS: FeedbackLimits = {
  ipPerHour: 2,
  ipPerDay: 5,
  globalPerMinute: 10,
  globalPerDay: 100,
};

export type LimitWindow = {
  name: keyof FeedbackLimits;
  scope: "ip" | "global";
  windowMs: number;
};

export const LIMIT_WINDOWS: readonly LimitWindow[] = [
  { name: "ipPerHour", scope: "ip", windowMs: HOUR_MS },
  { name: "ipPerDay", scope: "ip", windowMs: DAY_MS },
  { name: "globalPerMinute", scope: "global", windowMs: MINUTE_MS },
  { name: "globalPerDay", scope: "global", windowMs: DAY_MS },
];

export const LONGEST_WINDOW_MS = DAY_MS;

export type AttemptDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; window: keyof FeedbackLimits };

type EvaluateInput = {
  now: number;
  /** Attempt timestamps for this client, any order, may include expired entries. */
  ipTimes: readonly number[];
  /** Attempt timestamps across every client. */
  globalTimes: readonly number[];
  limits: FeedbackLimits;
};

/**
 * Rolling-window check. The attempt is allowed only when every window has room.
 * When blocked, Retry-After is the longest wait among exhausted windows, which is
 * the first moment all of them have room again.
 */
export function evaluateAttempt({ now, ipTimes, globalTimes, limits }: EvaluateInput): AttemptDecision {
  let worst: { retryAfterMs: number; window: keyof FeedbackLimits } | null = null;

  for (const { name, scope, windowMs } of LIMIT_WINDOWS) {
    const max = limits[name];
    const times = scope === "ip" ? ipTimes : globalTimes;
    const inWindow = times.filter((at) => at > now - windowMs).sort((a, b) => a - b);
    if (inWindow.length < max) continue;

    const freesAt = inWindow[inWindow.length - max] + windowMs;
    const retryAfterMs = Math.max(1, freesAt - now);
    if (!worst || retryAfterMs > worst.retryAfterMs) worst = { retryAfterMs, window: name };
  }

  if (!worst) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(worst.retryAfterMs / 1000)),
    window: worst.window,
  };
}

const LIMIT_ENV = {
  ipPerHour: "FEEDBACK_LIMIT_IP_HOUR",
  ipPerDay: "FEEDBACK_LIMIT_IP_DAY",
  globalPerMinute: "FEEDBACK_LIMIT_GLOBAL_MINUTE",
  globalPerDay: "FEEDBACK_LIMIT_GLOBAL_DAY",
} as const satisfies Record<keyof FeedbackLimits, string>;

/** Server-side overrides. Invalid or non-positive values fall back to the defaults. */
export function readFeedbackLimits(env: Record<string, string | undefined>): FeedbackLimits {
  const read = (name: keyof FeedbackLimits): number => {
    const parsed = Number(env[LIMIT_ENV[name]]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_FEEDBACK_LIMITS[name];
  };
  return {
    ipPerHour: read("ipPerHour"),
    ipPerDay: read("ipPerDay"),
    globalPerMinute: read("globalPerMinute"),
    globalPerDay: read("globalPerDay"),
  };
}
