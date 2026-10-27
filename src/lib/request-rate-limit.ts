import { createHmac } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { getServerConvex } from "@/lib/convex-server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  /** "shared" when the Convex-backed limiter answered, "local" for the per-instance fallback. */
  store: "shared" | "local";
};

const buckets = new Map<string, RateLimitBucket>();

/**
 * Per-instance in-memory limiter. Only a fallback now: each Vercel instance
 * has its own map, so on its own it does not bound traffic across instances.
 */
export function checkRequestRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
) {
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

const consumeRef = makeFunctionReference<
  "mutation",
  { readSecret: string; key: string; limit: number; windowMs: number },
  { allowed: boolean; remaining: number; resetAt: number }
>("rateLimits:consume");

const SHARED_TIMEOUT_MS = 1_500;
const SCOPE_RE = /^[a-z0-9-]{1,32}$/;

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** HMAC of the client IP so Convex never stores raw addresses. */
export function sharedRateLimitKey(scope: string, ip: string, secret: string): string {
  if (!SCOPE_RE.test(scope)) throw new Error(`Invalid rate limit scope: ${scope}`);
  const digest = createHmac("sha256", secret).update(ip).digest("base64url").slice(0, 32);
  return `api:${scope}:${digest}`;
}

/**
 * Shared rate limit backed by Convex `rateLimits:consume` (the same
 * `rateLimitBuckets` table the push registration limiter uses), so the limit
 * holds across every Vercel instance. Falls back to the per-instance limiter
 * when Convex is not configured, errors, or is slow, so a Convex problem never
 * takes the API down.
 */
export async function checkSharedRateLimit(args: {
  scope: string;
  headers: Headers;
  limit: number;
  windowMs: number;
  env?: Record<string, string | undefined>;
}): Promise<RateLimitResult> {
  const ip = clientIp(args.headers);
  const convex = getServerConvex(args.env);
  if (convex?.readSecret) {
    // One abortable client per call: the shared client would queue this mutation
    // behind a slow one, and a timeout would leave the HTTP request running.
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Shared rate limit timed out")),
      SHARED_TIMEOUT_MS,
    );
    try {
      const result = await convex.clientWithSignal(controller.signal).mutation(consumeRef, {
        readSecret: convex.readSecret,
        key: sharedRateLimitKey(args.scope, ip, convex.readSecret),
        limit: args.limit,
        windowMs: args.windowMs,
      });
      return { ...result, store: "shared" };
    } catch (error) {
      console.warn("Shared rate limit unavailable, using per-instance limiter.", error);
    } finally {
      clearTimeout(timer);
    }
  }

  const local = checkRequestRateLimit(`${args.scope}:${ip}`, args.limit, args.windowMs);
  return { ...local, store: "local" };
}

export function rateLimitHeaders(limit: number, result: Pick<RateLimitResult, "remaining" | "resetAt">) {
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function retryAfterSeconds(resetAt: number, now = Date.now()): string {
  return String(Math.max(1, Math.ceil((resetAt - now) / 1000)));
}
