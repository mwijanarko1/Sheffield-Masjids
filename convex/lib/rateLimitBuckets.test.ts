import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBucket } from "./rateLimitBuckets";

test("first hit opens a window", () => {
  const d = evaluateBucket(null, 1_000, 2, 60_000);
  assert.deepEqual(d, { allowed: true, remaining: 1, resetAt: 61_000, next: { windowStart: 1_000, count: 1 } });
});

test("hits inside the window count up and then block without writing", () => {
  const second = evaluateBucket({ windowStart: 1_000, count: 1 }, 2_000, 2, 60_000);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.deepEqual(second.next, { windowStart: 1_000, count: 2 });

  const third = evaluateBucket({ windowStart: 1_000, count: 2 }, 3_000, 2, 60_000);
  assert.deepEqual(third, { allowed: false, remaining: 0, resetAt: 61_000, next: null });
});

test("an expired window resets", () => {
  const d = evaluateBucket({ windowStart: 1_000, count: 99 }, 61_000, 2, 60_000);
  assert.equal(d.allowed, true);
  assert.deepEqual(d.next, { windowStart: 61_000, count: 1 });
});
