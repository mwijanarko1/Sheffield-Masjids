import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

test("error responses point agents to the feedback channel without changing the error field", async () => {
  const request = new NextRequest(
    "https://www.sheffieldmasjids.com/api/calendar-feed?mosque=",
    { headers: { "x-forwarded-for": `test-${crypto.randomUUID()}` } },
  );

  const response = await GET(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
  assert.deepEqual(body.report, {
    endpoint: "/api/feedback",
    form: "/report-api-issue",
    docs: "/llms.txt",
  });
});
