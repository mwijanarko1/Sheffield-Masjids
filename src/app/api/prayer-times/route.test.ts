import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

test("returns prayer times from published static data", async () => {
  const request = new NextRequest(
    "https://www.sheffieldmasjids.com/api/prayer-times?mosque=madina-masjid-sheffield&date=2026-04-10",
    { headers: { "x-forwarded-for": `test-${crypto.randomUUID()}` } },
  );

  const response = await GET(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mosque.slug, "madina-masjid-sheffield");
  assert.equal(body.date, "2026-04-10");
  assert.equal(body.source, "published-static-data");
  assert.equal(body.adhan.fajr, "04:09");
  assert.equal(body.iqamah.fajr, "05:30");
});

test("error responses point agents to the feedback channel without changing the error field", async () => {
  const request = new NextRequest(
    "https://www.sheffieldmasjids.com/api/prayer-times?mosque=madina-masjid-sheffield&date=10/04/2026",
    { headers: { "x-forwarded-for": `test-${crypto.randomUUID()}` } },
  );

  const response = await GET(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Date must be a valid YYYY-MM-DD value.");
  assert.deepEqual(body.report, { endpoint: "/api/feedback", form: "/report-api-issue", docs: "/llms.txt" });
});
