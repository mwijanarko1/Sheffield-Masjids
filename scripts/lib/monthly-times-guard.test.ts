import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { findSuspiciousMonthlyTimes } from "./monthly-times-guard";

const day = (date: number, t: Partial<Record<string, string>>) => ({
  date, fajr: "05:30", shurooq: "07:10", dhuhr: "11:50", asr: "14:00", maghrib: "16:30", isha: "18:10", ...t,
});
const iq = (date_range: string, t: Partial<Record<string, string>> = {}) => ({
  date_range, fajr: "06:00", dhuhr: "12:30", asr: "14:30", maghrib: "16:30", isha: "19:00", ...t,
});

test("accepts a normal winter and summer month, blank cells and labels", () => {
  assert.deepEqual(findSuspiciousMonthlyTimes({ prayer_times: [day(1, {}), day(2, { dhuhr: "13:05" })], iqamah_times: [iq("1-2")] }), []);
  assert.deepEqual(findSuspiciousMonthlyTimes({ prayer_times: [day(1, { isha: "-" })], iqamah_times: [iq("1", { fajr: "-", asr: "-", isha: "-" })] }), []);
  // Summer-solstice 00:00 Fajr jamaat is legitimate and only one field.
  assert.deepEqual(findSuspiciousMonthlyTimes({ prayer_times: [day(22, { dhuhr: "13:02" })], iqamah_times: [iq("22", { fajr: "00:00" })] }), []);
});

test("rejects 12h Dhuhr forced to PM (Al-Azhar style 23:49)", () => {
  const issues = findSuspiciousMonthlyTimes({ prayer_times: [day(1, { dhuhr: "23:49" })], iqamah_times: [iq("1")] });
  assert.equal(issues.length, 1);
  assert.match(issues[0], /day 1: dhuhr adhan 23:49/);
});

test("rejects unconverted afternoon Dhuhr (01:07)", () => {
  assert.equal(findSuspiciousMonthlyTimes({ prayer_times: [day(3, { dhuhr: "01:07" })], iqamah_times: [] }).length, 1);
});

test("rejects all-identical rows (Al-Rawdha style 01:00)", () => {
  const all = { fajr: "01:00", shurooq: "01:00", dhuhr: "01:00", asr: "01:00", maghrib: "01:00", isha: "01:00" };
  const issues = findSuspiciousMonthlyTimes({ prayer_times: [day(1, all)], iqamah_times: [iq("1", all)] });
  assert.ok(issues.some((i) => /all adhan times identical/.test(i)));
  assert.ok(issues.some((i) => /all jamaat times identical/.test(i)));
});

/**
 * Repo files that already fail the guard. They need source re-verification before they can be
 * seeded (or seeding with --allow-suspicious-times). Remove entries as files are fixed; new
 * failures make this test fail.
 */
const KNOWN_SUSPECT_FILES = new Set([
  "au/adelaide/adelaide-city-mosque/january.json",
  "au/sydney/lakemba-mosque/april.json",
  "au/sydney/lakemba-mosque/december.json",
  "au/sydney/lakemba-mosque/july.json",
  "au/sydney/lakemba-mosque/june.json",
  "au/sydney/lakemba-mosque/march.json",
  "au/sydney/lakemba-mosque/may.json",
  "au/sydney/lakemba-mosque/september.json",
  "ca/ottawa/jami-omar-mosque/april.json",
  "ca/ottawa/jami-omar-mosque/august.json",
  "ca/ottawa/jami-omar-mosque/july.json",
  "ca/ottawa/jami-omar-mosque/june.json",
  "ca/ottawa/jami-omar-mosque/march.json",
  "ca/ottawa/jami-omar-mosque/may.json",
  "ca/ottawa/jami-omar-mosque/september.json",
  "gb/dundee/dundee-central-mosque/july.json",
  "gb/edinburgh/edinburgh-central-mosque/july.json",
  "gb/leicester/madrasah-baytul-ilm/july.json",
  "gb/leicester/masjid-aisha/april.json",
  "gb/leicester/taybah-educational-centre/march.json",
  "gb/london/masjid-al-fath-hqiec/august.json",
  "gb/london/masjid-al-fath-hqiec/may.json",
  "gb/london/masjid-quba-stamford-hill/december.json",
  "gb/loughborough/loughborough-mosque/december.json",
  "gb/loughborough/loughborough-mosque/february.json",
  "gb/loughborough/loughborough-mosque/january.json",
  "gb/loughborough/loughborough-mosque/march.json",
  "gb/loughborough/loughborough-mosque/november.json",
  "gb/loughborough/loughborough-mosque/october.json",
  "gb/manchester/masjid-e-hidayah/august.json",
  "gb/oldham/european-islamic-centre/april.json",
  "gb/oldham/european-islamic-centre/august.json",
  "gb/oldham/european-islamic-centre/july.json",
  "gb/oldham/european-islamic-centre/june.json",
  "gb/oldham/european-islamic-centre/march.json",
  "gb/oldham/european-islamic-centre/may.json",
  "gb/oldham/european-islamic-centre/september.json",
  "gb/slough/masjid-al-jannah-slough/february.json",
  "gb/slough/masjid-al-jannah-slough/january.json",
  "gb/south-shields/al-azhar-mosque/march.json",
  "us/lanham/diyanet-center-of-america/april.json",
  "us/lanham/diyanet-center-of-america/august.json",
  "us/lanham/diyanet-center-of-america/july.json",
  "us/lanham/diyanet-center-of-america/june.json",
  "us/lanham/diyanet-center-of-america/may.json",
  "us/lanham/diyanet-center-of-america/september.json",
  "us/memphis/memphis-islamic-center/april.json",
  "us/memphis/memphis-islamic-center/august.json",
  "us/memphis/memphis-islamic-center/july.json",
  "us/memphis/memphis-islamic-center/june.json",
  "us/memphis/memphis-islamic-center/march.json",
  "us/memphis/memphis-islamic-center/september.json",
  "us/naperville/islamic-center-naperville/march.json",
  "us/pittsburgh/islamic-center-pittsburgh/april.json",
  "us/pittsburgh/islamic-center-pittsburgh/august.json",
  "us/pittsburgh/islamic-center-pittsburgh/july.json",
  "us/pittsburgh/islamic-center-pittsburgh/june.json",
  "us/pittsburgh/islamic-center-pittsburgh/march.json",
  "us/pittsburgh/islamic-center-pittsburgh/may.json",
  "us/pittsburgh/islamic-center-pittsburgh/october.json",
  "us/pittsburgh/islamic-center-pittsburgh/september.json",
]);

const MONTH_FILE_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)\.json$/;

function monthFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...monthFiles(p, base));
    else if (MONTH_FILE_RE.test(name)) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

test("every repo month file passes the guard except the documented suspect list", () => {
  const root = path.join(process.cwd(), "public/data/mosques");
  const failing: string[] = [];
  for (const rel of monthFiles(root)) {
    const data = JSON.parse(readFileSync(path.join(root, rel), "utf8"));
    if (findSuspiciousMonthlyTimes(data).length > 0) failing.push(rel);
  }
  const unexpected = failing.filter((f) => !KNOWN_SUSPECT_FILES.has(f));
  assert.deepEqual(unexpected, [], `new suspicious month files: ${unexpected.join(", ")}`);
  const fixed = [...KNOWN_SUSPECT_FILES].filter((f) => !failing.includes(f));
  assert.deepEqual(fixed, [], `these files now pass; remove them from KNOWN_SUSPECT_FILES: ${fixed.join(", ")}`);
});
