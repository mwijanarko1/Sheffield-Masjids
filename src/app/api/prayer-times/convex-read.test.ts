import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { startFakeConvex, withConvexEnv, type FakeConvex } from "@/lib/testing/fake-convex";

const SECRET = "test-read-secret";
let fake: FakeConvex;

before(async () => {
  fake = await startFakeConvex();
});
after(async () => {
  await fake.close();
});

function reset() {
  fake.calls.length = 0;
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60_000 }));
  fake.handlers.set("prayerTimes:getRamadan", () => null);
}

async function getApi(query: string, ip = `test-${crypto.randomUUID()}`) {
  const response = await GET(new NextRequest(
    `https://www.sheffieldmasjids.com/api/prayer-times?${query}`,
    { headers: { "x-forwarded-for": ip } },
  ));
  return { response, status: response.status, body: await response.json() };
}

const CONVEX_OCTOBER = {
  month: "OCTOBER",
  prayer_times: [
    { date: 30, fajr: "05:11", shurooq: "06:55", dhuhr: "11:55", asr: "14:30", maghrib: "16:40", isha: "18:10" },
  ],
  iqamah_times: [
    { date_range: "30", fajr: "06:00", dhuhr: "13:00", asr: "15:00", maghrib: "16:45", isha: "19:15" },
  ],
  jummah_iqamah: "13:15",
};

test("reads the day from Convex server-side and sends the read secret", async () => {
  reset();
  fake.handlers.set("prayerTimes:getMonthly", () => CONVEX_OCTOBER);
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { response, status, body } = await getApi("mosque=madina-masjid-sheffield&date=2026-10-30");
    assert.equal(status, 200);
    assert.equal(body.source, "convex");
    assert.equal(response.headers.get("x-data-source"), "convex");
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    // Convex values, not the repo JSON values.
    assert.equal(body.adhan.fajr, "05:11");
    assert.deepEqual(body.iqamah, {
      fajr: "06:00", dhuhr: "13:00", asr: "15:00", maghrib: "16:45", isha: "19:15", jummah: "13:15",
    });

    const monthly = fake.calls.find((call) => call.path === "prayerTimes:getMonthly");
    assert.deepEqual(monthly?.args, {
      mosqueSlug: "madina-masjid-sheffield", month: "october", year: 2026, readSecret: SECRET,
    });
    const ramadan = fake.calls.find((call) => call.path === "prayerTimes:getRamadan");
    assert.equal(ramadan?.args.readSecret, SECRET);
  });
});

test("adhan-only day from Convex (empty iqamah_times) returns 200 with iqamah null", async () => {
  reset();
  fake.handlers.set("prayerTimes:getMonthly", () => ({ ...CONVEX_OCTOBER, iqamah_times: [] }));
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, body } = await getApi("mosque=madina-masjid-sheffield&date=2026-10-30");
    assert.equal(status, 200);
    assert.equal(body.iqamah, null);
    assert.equal(body.adhan.isha, "18:10");
    assert.equal(body.source, "convex");
  });
});

test("Convex is authoritative: a month Convex does not have is 404, not the repo JSON", async () => {
  reset();
  fake.handlers.set("prayerTimes:getMonthly", () => null);
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    // Repo JSON has this day (see route.test.ts), Convex says no row.
    const { status, body } = await getApi("mosque=madina-masjid-sheffield&date=2026-04-10");
    assert.equal(status, 404);
    assert.match(body.error, /not available/);
  });
});

test("Convex errors (for example a rejected secret) fall back to repo JSON, labelled and short-cached", async () => {
  reset();
  fake.handlers.set("prayerTimes:getMonthly", () => {
    throw new Error("Invalid or missing read secret");
  });
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: "wrong" }, async () => {
    const { response, status, body } = await getApi("mosque=madina-masjid-sheffield&date=2026-04-10");
    assert.equal(status, 200);
    assert.equal(body.source, "published-static-data");
    assert.equal(body.adhan.fajr, "04:09");
    assert.equal(response.headers.get("x-data-source"), "static-fallback");
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=60\b/);
  });
});

test("Ramadan rows from Convex win over the monthly file inside the Ramadan range", async () => {
  reset();
  fake.handlers.set("prayerTimes:getMonthly", () => ({ ...CONVEX_OCTOBER, month: "FEBRUARY" }));
  fake.handlers.set("prayerTimes:getRamadan", () => ({
    month: "RAMADAN",
    gregorian_start: "2026-02-18",
    gregorian_end: "2026-03-19",
    prayer_times: [
      { ramadan_day: 3, gregorian: "2026-02-20", fajr: "05:01", shurooq: "07:10", dhuhr: "12:20", asr: "15:00", maghrib: "17:30", isha: "19:00" },
    ],
    iqamah_times: [],
    jummah_iqamah: "13:00",
  }));
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, body } = await getApi("mosque=madina-masjid-sheffield&date=2026-02-20");
    assert.equal(status, 200);
    assert.equal(body.adhan.fajr, "05:01");
    assert.equal(body.iqamah, null);
  });
});

test("shared rate limit: Convex says blocked, route answers 429 with Retry-After", async () => {
  reset();
  const resetAt = Date.now() + 42_000;
  fake.handlers.set("rateLimits:consume", () => ({ allowed: false, remaining: 0, resetAt }));
  fake.handlers.set("prayerTimes:getMonthly", () => CONVEX_OCTOBER);
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { response, status } = await getApi("mosque=madina-masjid-sheffield&date=2026-10-30", "203.0.113.7");
    assert.equal(status, 429);
    const retry = Number(response.headers.get("retry-after"));
    assert.ok(retry >= 40 && retry <= 42, String(retry));
    assert.equal(response.headers.get("ratelimit-remaining"), "0");

    const consume = fake.calls.find((call) => call.path === "rateLimits:consume");
    assert.equal(consume?.kind, "mutation");
    assert.equal(consume?.args.readSecret, SECRET);
    assert.equal(consume?.args.limit, 60);
    assert.equal(consume?.args.windowMs, 60_000);
    assert.match(String(consume?.args.key), /^api:prayer-times:[A-Za-z0-9_-]{32}$/);
    assert.ok(!String(consume?.args.key).includes("203.0.113.7"), "raw IP must not be sent");
    // Blocked requests never read prayer times.
    assert.ok(!fake.calls.some((call) => call.path === "prayerTimes:getMonthly"));
  });
});

test("shared rate limit unavailable: falls back to the per-instance limiter instead of failing", async () => {
  reset();
  fake.handlers.set("rateLimits:consume", () => {
    throw new Error("boom");
  });
  fake.handlers.set("prayerTimes:getMonthly", () => CONVEX_OCTOBER);
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, response } = await getApi("mosque=madina-masjid-sheffield&date=2026-10-30");
    assert.equal(status, 200);
    assert.equal(response.headers.get("ratelimit-remaining"), "59");
  });
});

test("malformed or out-of-range dates are rejected before Convex is called", async () => {
  reset();
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    for (const date of ["2026-02-30", "1990-01-01", "3000-01-01", "garbage"]) {
      const { status } = await getApi(`mosque=madina-masjid-sheffield&date=${date}`);
      assert.equal(status, 400, date);
    }
    assert.equal(fake.calls.length, 0);
  });
});
