import assert from "node:assert/strict";
import test from "node:test";
import { checkRequestRateLimit } from "./request-rate-limit";

test("limits requests within a fixed window and resets afterwards", () => {
  const key = `test-${crypto.randomUUID()}`;

  assert.equal(checkRequestRateLimit(key, 2, 1_000, 10_000).allowed, true);
  assert.equal(checkRequestRateLimit(key, 2, 1_000, 10_100).allowed, true);
  assert.equal(checkRequestRateLimit(key, 2, 1_000, 10_200).allowed, false);
  assert.equal(checkRequestRateLimit(key, 2, 1_000, 11_000).allowed, true);
});

test("shared rate limit keys are scoped and never contain the raw IP", async () => {
  const { sharedRateLimitKey } = await import("./request-rate-limit");
  const key = sharedRateLimitKey("prayer-times", "198.51.100.23", "secret");
  assert.match(key, /^api:prayer-times:[A-Za-z0-9_-]{32}$/);
  assert.ok(!key.includes("198.51.100.23"));
  assert.notEqual(key, sharedRateLimitKey("prayer-times", "198.51.100.23", "other-secret"));
  assert.notEqual(key, sharedRateLimitKey("mcp", "198.51.100.23", "secret"));
  assert.throws(() => sharedRateLimitKey("Bad Scope", "x", "secret"));
});

test("without Convex configured the shared limiter falls back to the local one", async () => {
  const { checkSharedRateLimit } = await import("./request-rate-limit");
  const headers = new Headers({ "x-forwarded-for": `local-${crypto.randomUUID()}` });
  const first = await checkSharedRateLimit({ scope: "prayer-times", headers, limit: 1, windowMs: 60_000, env: {} });
  const second = await checkSharedRateLimit({ scope: "prayer-times", headers, limit: 1, windowMs: 60_000, env: {} });
  assert.equal(first.store, "local");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});
