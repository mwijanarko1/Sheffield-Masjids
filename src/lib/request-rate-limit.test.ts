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
