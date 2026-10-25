import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";
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
