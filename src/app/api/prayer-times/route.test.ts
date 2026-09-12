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
