import assert from "node:assert/strict";
import test from "node:test";
import { getPrayerTimes, searchMosques } from "@/lib/mcp/prayer-tools";

test("search_mosques finds Madina Masjid Sheffield by name", async () => {
  const result = await searchMosques({ query: "Madina Masjid Sheffield", limit: 5 });
  assert.ok(!("error" in result));
  assert.ok(result.count >= 1);
  assert.equal(result.mosques[0]?.slug, "madina-masjid-sheffield");
  assert.match(result.mosques[0]?.url ?? "", /\/mosques\/madina-masjid-sheffield$/);
});

test("search_mosques filters by city slug", async () => {
  const result = await searchMosques({
    query: "masjid",
    city: "sheffield",
    limit: 10,
  });
  assert.ok(!("error" in result));
  assert.ok(result.count >= 1);
  for (const mosque of result.mosques) {
    assert.equal(mosque.city, "Sheffield");
  }
});

test("get_prayer_times returns adhan and iqamah for a known date", async () => {
  const result = await getPrayerTimes({
    mosque: "madina-masjid-sheffield",
    date: "2026-04-10",
  });
  assert.ok(!("error" in result));
  assert.equal(result.date, "2026-04-10");
  assert.equal(result.timezone, "Europe/London");
  assert.equal(result.adhan.fajr, "04:09");
  assert.equal(result.iqamah.fajr, "05:30");
  assert.ok(result.iqamah.jummah);
});

test("get_prayer_times rejects invalid dates", async () => {
  const result = await getPrayerTimes({
    mosque: "madina-masjid-sheffield",
    date: "10/04/2026",
  });
  assert.ok("error" in result);
  assert.match(result.error, /YYYY-MM-DD/);
});

test("get_prayer_times asks callers to search when mosque is unknown", async () => {
  const result = await getPrayerTimes({
    mosque: "not-a-real-mosque-xyz",
  });
  assert.ok("error" in result);
  assert.match(result.error, /search_mosques/);
});
