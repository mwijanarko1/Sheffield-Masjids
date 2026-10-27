import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

// These cases cover the repo JSON fallback (no Convex configured).
// convex-read.test.ts covers the Convex read path.
delete process.env.CONVEX_URL;
delete process.env.CONVEX_READ_SECRET;

test("falls back to published static data when Convex is not configured", async () => {
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

async function getApi(query: string) {
  const response = await GET(new NextRequest(
    `https://www.sheffieldmasjids.com/api/prayer-times?${query}`,
    { headers: { "x-forwarded-for": `test-${crypto.randomUUID()}` } },
  ));
  return { status: response.status, body: await response.json() };
}

test("adhan-only published month returns 200 with adhan times and null iqamah", async () => {
  const { status, body } = await getApi("mosque=essalam-mosque&date=2026-11-10");
  assert.equal(status, 200);
  assert.deepEqual(body.adhan, {
    fajr: "05:56", sunrise: "07:45", dhuhr: "12:31", asr: "14:39", maghrib: "17:07", isha: "18:43",
  });
  assert.equal(body.iqamah, null);
  assert.equal(body.timezone, "Europe/Amsterdam");
  assert.equal(body.source, "published-static-data");
});

test("a published adhan row without an iqamah entry returns null iqamah, not an invented one", async () => {
  const { status, body } = await getApi("mosque=essalam-mosque&date=2026-10-31");
  assert.equal(status, 200);
  assert.equal(body.adhan.fajr, "05:40");
  assert.equal(body.adhan.isha, "18:58");
  assert.equal(body.iqamah, null);
});

test("mosques with published iqamah keep the same response shape", async () => {
  const { status, body } = await getApi("mosque=aisha-mosque-and-islamic-centre&date=2026-10-30");
  assert.equal(status, 200);
  const { url: _url, ...mosque } = body.mosque;
  assert.deepEqual({ ...body, mosque }, {
    mosque: {
      slug: "aisha-mosque-and-islamic-centre",
      name: "Aisha Mosque & Islamic Centre",
      city: "Walsall",
      country: "United Kingdom",
      address: "4 Rutter Street, Walsall WS1 4HJ, United Kingdom",
    },
    date: "2026-10-30",
    timezone: "Europe/London",
    adhan: { fajr: "05:20", sunrise: "07:00", dhuhr: "12:00", asr: "14:50", maghrib: "16:45", isha: "17:45" },
    iqamah: { fajr: "06:15", dhuhr: "13:30", asr: "15:15", maghrib: "16:45", isha: "19:30", jummah: "12:20 / 13:20" },
    source: "published-static-data",
  });
});

test("days with no published adhan row still return 404", async () => {
  for (const query of [
    "mosque=essalam-mosque&date=2026-11-24", // past the last published November row
    "mosque=essalam-mosque&date=2026-12-10", // no December file
    "mosque=not-a-real-mosque&date=2026-10-30",
  ]) {
    const { status, body } = await getApi(query);
    assert.equal(status, 404, query);
    assert.match(body.error, /not available|not found/, query);
  }
});

test("rejects malformed and out-of-range dates with 400 before any lookup", async () => {
  for (const date of ["2026-02-30", "2026-13-01", "2026-1-05", "26-01-05", "2026-01-05T00:00", "1999-01-01", "2200-06-01"]) {
    const { status, body } = await getApi(`mosque=madina-masjid-sheffield&date=${encodeURIComponent(date)}`);
    assert.equal(status, 400, date);
    assert.match(body.error, /YYYY-MM-DD|between/, date);
  }
});

test("rejects over-long or malformed mosque slugs with 400", async () => {
  for (const mosque of ["", "Bad Slug", "a".repeat(65), "--x"]) {
    const { status } = await getApi(`mosque=${encodeURIComponent(mosque)}&date=2026-10-30`);
    assert.equal(status, 400, mosque);
  }
});
