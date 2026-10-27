import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { loadMonthlyPrayerTimes } from "@/lib/prayer-times";
import { startFakeConvex, withConvexEnv, type FakeConvex } from "@/lib/testing/fake-convex";

const SECRET = "timetable-test-secret";
let fake: FakeConvex;

before(async () => {
  fake = await startFakeConvex();
});
after(async () => {
  await fake.close();
});

async function call(query: string) {
  const response = await GET(new NextRequest(
    `https://www.sheffieldmasjids.com/api/timetable?${query}`,
    { headers: { "x-forwarded-for": `test-${crypto.randomUUID()}` } },
  ));
  return { response, status: response.status, body: await response.json() };
}

test("rejects anything outside the strict input set with 400", async () => {
  for (const query of [
    "mosque=not-a-real-mosque&month=10&year=2026",
    "mosque=madina-masjid-sheffield&month=13&year=2026",
    "mosque=madina-masjid-sheffield&month=0&year=2026",
    "mosque=madina-masjid-sheffield&month=010&year=2026",
    "mosque=madina-masjid-sheffield&month=10&year=1999",
    "mosque=madina-masjid-sheffield&month=10&year=26",
    "mosque=madina-masjid-sheffield&month=10",
    "mosque=madina-masjid-sheffield&month=10&year=2026&cachebust=1",
    "mosque=madina-masjid-sheffield&month=10&month=11&year=2026",
    "mosque=madina-masjid-sheffield&ramadan=yes",
    "mosque=madina-masjid-sheffield&ramadan=1&year=2026",
  ]) {
    const { status } = await call(query);
    assert.equal(status, 400, query);
  }
});

test("serves the month from Convex server-side with the read secret", async () => {
  fake.calls.length = 0;
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 239, resetAt: Date.now() + 60_000 }));
  fake.handlers.set("prayerTimes:getMonthly", () => ({
    month: "NOVEMBER",
    prayer_times: [{ date: 1, fajr: "05:30", shurooq: "07:05", dhuhr: "11:50", asr: "14:05", maghrib: "16:30", isha: "18:00" }],
    iqamah_times: [],
    jummah_iqamah: "",
  }));
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, body, response } = await call("mosque=madina-masjid-sheffield&month=11&year=2026");
    assert.equal(status, 200);
    assert.equal(body.monthly.prayer_times[0].fajr, "05:30");
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    const monthly = fake.calls.find((c) => c.path === "prayerTimes:getMonthly");
    assert.equal(monthly?.args.readSecret, SECRET);
    assert.equal(monthly?.args.month, "november");
  });
});

test("without Convex configured it serves the repo JSON month", async () => {
  await withConvexEnv({}, async () => {
    const { status, body } = await call("mosque=madina-masjid-sheffield&month=4&year=2026");
    assert.equal(status, 200);
    assert.equal(body.monthly.prayer_times.find((row: { date: number }) => row.date === 10).fajr, "04:09");
  });
});

// These integration cases drive the real route, SDK HTTP client and disk reader.
// A local Convex HTTP boundary makes missing rows and outages reproducible without deploying.
test("a missing Convex month is authoritative even when the repo has that month", async () => {
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 239, resetAt: Date.now() + 60_000 }));
  fake.handlers.set("prayerTimes:getMonthly", () => null);
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, body } = await call("mosque=muslim-welfare-house&month=4&year=2026");
    assert.equal(status, 404, JSON.stringify(body).slice(0, 300));
  });
});

test("yearless repo files are not returned for an uncovered year without Convex", async () => {
  await withConvexEnv({}, async () => {
    const { status, body } = await call("mosque=madina-masjid-sheffield&month=4&year=2027");
    assert.equal(status, 404, JSON.stringify(body).slice(0, 300));
  });
});

test("a Convex outage does not replay 2026 files for a 2027 request", async () => {
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 239, resetAt: Date.now() + 60_000 }));
  fake.handlers.set("prayerTimes:getMonthly", () => { throw new Error("review outage"); });
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const { status, body } = await call("mosque=sheffield-grand-mosque&month=4&year=2027");
    assert.equal(status, 404, JSON.stringify(body).slice(0, 300));
  });
});

test("covered-year outage fallback stays labelled and short-cached on repeated requests", async () => {
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 239, resetAt: Date.now() + 60_000 }));
  fake.handlers.set("prayerTimes:getMonthly", () => { throw new Error("review outage"); });
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { status, body, response } = await call("mosque=darululoom-siddiqia-masjid&month=4&year=2026");
      assert.equal(status, 200, JSON.stringify(body).slice(0, 300));
      assert.equal(body.monthly.month, "APRIL");
      assert.equal(response.headers.get("x-data-source"), "static-fallback");
      assert.equal(response.headers.get("cache-control"), "public, max-age=30, s-maxage=60");
    }
  });
});

test("fallback data expires in-process within a minute so a recovered backend wins", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  fake.handlers.clear();
  fake.handlers.set("rateLimits:consume", () => ({ allowed: true, remaining: 239, resetAt: now + 60_000 }));
  fake.handlers.set("prayerTimes:getMonthly", () => { throw new Error("temporary outage"); });
  await withConvexEnv({ CONVEX_URL: fake.url, CONVEX_READ_SECRET: SECRET }, async () => {
    const query = "mosque=madina-masjid-sheffield&month=5&year=2026";
    const fallback = await call(query);
    assert.equal(fallback.status, 200);
    assert.equal(fallback.response.headers.get("x-data-source"), "static-fallback");
    fake.handlers.set("prayerTimes:getMonthly", () => ({
      month: "MAY",
      prayer_times: [{ date: 1, fajr: "03:15", shurooq: "05:25", dhuhr: "13:05", asr: "17:10", maghrib: "20:00", isha: "21:30" }],
      iqamah_times: [],
      jummah_iqamah: "",
    }));
    now += 60_001;
    const recovered = await call(query);
    assert.equal(recovered.status, 200);
    assert.equal(recovered.response.headers.get("x-data-source"), "convex");
    assert.equal(recovered.body.monthly.prayer_times[0].fajr, "03:15");
    fake.calls.length = 0;
    now += 60_001;
    const cached = await call(query);
    assert.equal(cached.response.headers.get("x-data-source"), "convex");
    assert.equal(cached.body.monthly.prayer_times[0].fajr, "03:15");
    assert.ok(!fake.calls.some((entry) => entry.path === "prayerTimes:getMonthly"));
  });
});

test("browser monthly requests do not resurrect a missing month or an uncovered year", async (t) => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url ?? "");
    res.statusCode = req.url?.includes("year=2027") ? 400 : 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Timetable unavailable" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  // SAFETY: The awaited TCP listener has an AddressInfo, not a Unix socket path.
  const { port } = server.address() as AddressInfo;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString(), `http://127.0.0.1:${port}`);
    return realFetch(url, init);
  });
  try {
    await assert.rejects(loadMonthlyPrayerTimes("madina-masjid-sheffield", 7, 2026));
    await assert.rejects(loadMonthlyPrayerTimes("madina-masjid-sheffield", 7, 2027));
    assert.equal(requests.length, 2, JSON.stringify(requests));
    assert.ok(requests.every((url) => url.startsWith("/api/timetable?")), JSON.stringify(requests));
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    t.mock.restoreAll();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
