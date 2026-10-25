/**
 * Fixed-window counter shared by every server instance, stored in the
 * `rateLimitBuckets` table (same table and shape as the push registration
 * limiter in pushSubscriptions.ts).
 */
export type BucketRow = { windowStart: number; count: number };

export type BucketDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  /** The row to write back, or null when nothing changes (request blocked). */
  next: BucketRow | null;
};

export function evaluateBucket(
  existing: BucketRow | null,
  now: number,
  limit: number,
  windowMs: number,
): BucketDecision {
  if (!existing || now - existing.windowStart >= windowMs) {
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: now + windowMs,
      next: { windowStart: now, count: 1 },
    };
  }

  const resetAt = existing.windowStart + windowMs;
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt, next: null };
  }

  const count = existing.count + 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    resetAt,
    next: { windowStart: existing.windowStart, count },
  };
}
