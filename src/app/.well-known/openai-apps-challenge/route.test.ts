import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("returns 404 when challenge token env is unset", async () => {
  const previous = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;

  try {
    const response = await GET();
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;
    else process.env.OPENAI_APPS_CHALLENGE_TOKEN = previous;
  }
});

test("returns exact challenge token as plain text", async () => {
  const previous = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  process.env.OPENAI_APPS_CHALLENGE_TOKEN = "challenge-token-abc";

  try {
    const response = await GET();
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.equal(body, "challenge-token-abc");
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;
    else process.env.OPENAI_APPS_CHALLENGE_TOKEN = previous;
  }
});
