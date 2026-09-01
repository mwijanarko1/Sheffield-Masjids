#!/usr/bin/env node
/**
 * Egypt major-city prayer times from the official Egyptian General Authority
 * of Survey (ESA) monthly timetable page.
 *
 * Source: https://www.esa.gov.eg/monthlymwaket.aspx  (the monthly view linked
 * from the ESA prayer-times page, https://www.esa.gov.eg/praytimes.aspx)
 *
 * ESA publishes one official timetable per city per month (Gregorian). The
 * site is ASP.NET WebForms: a city dropdown + month dropdown that post back
 * with __VIEWSTATE / __EVENTVALIDATION and return a table of daily times in
 * 12-hour format ("5:2 ص"). This script walks that flow with a cookie jar and
 * converts everything to 24-hour HH:MM.
 *
 * Run from repo root:
 *   node scripts/fetch-egypt-esa-times.mjs            # all major cities
 *   node scripts/fetch-egypt-esa-times.mjs --city cairo
 *
 * Writes: public/data/mosques/eg/{citySlug}/{citySlug}-mosques/{month}.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mosqueDataFsDir } from "./lib/mosque-data-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PAGE_URL = "https://www.esa.gov.eg/monthlymwaket.aspx";
const WEBSITE = "https://www.esa.gov.eg/praytimes.aspx";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const MONTH_NAMES_UPPER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const EGYPT_CITIES = [
  { citySlug: "cairo", esaCity: "القـاهـرة", cityName: "Cairo", lat: 30.0444, lng: 31.2357 },
  { citySlug: "alexandria", esaCity: "الأسكندرية", cityName: "Alexandria", lat: 31.2001, lng: 29.9187 },
  { citySlug: "sixth-of-october-city", esaCity: "6أكتـوبر", cityName: "6th of October City", lat: 29.9369, lng: 30.9165 },
  { citySlug: "luxor", esaCity: "الأقصر", cityName: "Luxor", lat: 25.6872, lng: 32.6396 },
  { citySlug: "aswan", esaCity: "أســوان", cityName: "Aswan", lat: 24.0889, lng: 32.8998 },
  { citySlug: "mansoura", esaCity: "المنصورة", cityName: "Mansoura", lat: 31.0409, lng: 31.3785 },
  { citySlug: "tanta", esaCity: "طنطــا", cityName: "Tanta", lat: 30.7885, lng: 31.0019 },
  { citySlug: "ismailia", esaCity: "الإسماعيلية", cityName: "Ismailia", lat: 30.5965, lng: 32.2715 },
  { citySlug: "port-said", esaCity: "بورسعيـد", cityName: "Port Said", lat: 31.2653, lng: 32.3019 },
  { citySlug: "suez", esaCity: "السـويس", cityName: "Suez", lat: 29.9668, lng: 32.5498 },
].map((c) => ({ ...c, mosqueSlug: `${c.citySlug}-mosques` }));

// ---- tiny cookie jar ----
let cookieJar = new Map();

function absorbCookies(setCookieHeaders) {
  for (const raw of setCookieHeaders ?? []) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "" || value.toLowerCase() === "deleted") cookieJar.delete(name);
    else cookieJar.set(name, value);
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function httpGet(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
  absorbCookies(res.headers.getSetCookie?.() ?? []);
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return text;
}

async function httpPost(url, form) {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: PAGE_URL,
      Cookie: cookieHeader(),
    },
    body,
  });
  absorbCookies(res.headers.getSetCookie?.() ?? []);
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${url} -> HTTP ${res.status}`);
  return text;
}

// ---- WebForms state ----
function extractState(html) {
  const grab = (id) => {
    const m = html.match(new RegExp(`id="${id}"\\s+value="([^"]*)"`));
    return m ? m[1] : "";
  };
  return {
    viewstate: grab("__VIEWSTATE"),
    generator: grab("__VIEWSTATEGENERATOR"),
    validation: grab("__EVENTVALIDATION"),
  };
}

function gridRows(html) {
  const i = html.indexOf("placeholder1_GridView1");
  if (i < 0) return null;
  // The grid id sits inside its <table ...> tag; start after that tag closes.
  const tagEnd = html.indexOf(">", i);
  if (tagEnd < 0) return null;
  const tableEnd = html.indexOf("</table>", tagEnd);
  if (tableEnd < 0) return null;
  const inner = html.slice(tagEnd + 1, tableEnd);
  const rows = [];
  for (const tr of inner.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    rows.push(cells);
  }
  return rows;
}

/** "5:2 ص" -> "05:02" (ص = AM, م = PM) */
function to24h(t) {
  const m = String(t).match(/^(\d{1,2}):(\d{1,2})\s*([صم])$/);
  if (!m) throw new Error(`unparseable ESA time: ${JSON.stringify(t)}`);
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === "م") {
    if (h !== 12) h += 12;
  } else {
    if (h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseMonthTable(rowsHtml, monthIndex) {
  const rows = gridRows(rowsHtml);
  if (!rows || rows.length < 2) {
    throw new Error(`month ${MONTH_NAMES_UPPER[monthIndex]}: no grid table in response`);
  }
  const body = rows.slice(1);
  const expected = new Date(2026, monthIndex + 1, 0).getDate();
  if (body.length !== expected) {
    throw new Error(`month ${MONTH_NAMES_UPPER[monthIndex]}: expected ${expected} days, got ${body.length}`);
  }
  return body.map((cells) => {
    const date = cells[1].match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!date) throw new Error(`bad date cell: ${cells[1]}`);
    return {
      date: Number(date[3]),
      fajr: to24h(cells[3]),
      shurooq: to24h(cells[4]),
      dhuhr: to24h(cells[5]),
      asr: to24h(cells[6]),
      maghrib: to24h(cells[7]),
      isha: to24h(cells[8]),
    };
  });
}

async function fetchMonth(city, monthIndex, state) {
  const form = {
    __EVENTTARGET: "ctl00$placeholder1$DropDownList1",
    __EVENTARGUMENT: "",
    __VIEWSTATE: state.viewstate,
    __VIEWSTATEGENERATOR: state.generator,
    __EVENTVALIDATION: state.validation,
    "ctl00$placeholder1$DropDownList1": city.esaCity,
    "ctl00$placeholder1$DropDownList2": String(monthIndex + 1),
  };
  const html = await httpPost(PAGE_URL, form);
  const monthly = parseMonthTable(html, monthIndex);
  return { monthly, state: extractState(html) };
}

async function fetchCity(city) {
  // Fresh page state per city.
  const page = await httpGet(PAGE_URL);
  let state = extractState(page);
  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    let attempt = await fetchMonth(city, mi, state);
    if (attempt.monthly.length === 0) {
      // state went stale: re-GET and retry once
      const fresh = await httpGet(PAGE_URL);
      state = extractState(fresh);
      attempt = await fetchMonth(city, mi, state);
    }
    months.push(attempt.monthly);
    state = attempt.state;
    process.stderr.write(`${city.cityName} ${MONTH_NAMES_UPPER[mi]}: ${attempt.monthly.length} days\n`);
  }
  return months;
}

function registryEntry(city) {
  return {
    id: city.mosqueSlug,
    name: `${city.cityName} Prayer Times`,
    address: `${city.cityName}, Egypt`,
    lat: city.lat,
    lng: city.lng,
    slug: city.mosqueSlug,
    citySlug: city.citySlug,
    cityName: city.cityName,
    countryCode: "EG",
    countryName: "Egypt",
    timezone: "Africa/Cairo",
    isHidden: false,
    website: WEBSITE,
  };
}

function updateRegistry(entries) {
  const path = join(ROOT, "public", "data", "mosques.json");
  const registry = JSON.parse(readFileSync(path, "utf8"));
  for (const entry of entries) {
    const index = registry.mosques.findIndex((mosque) => mosque.id === entry.id);
    if (index >= 0) registry.mosques[index] = entry;
    else registry.mosques.push(entry);
  }
  const json = JSON.stringify(registry, null, 2).replace(
    /[^\x00-\x7f]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  writeFileSync(path, `${json}\n`);
}

async function main() {
  const cityArg = process.argv.indexOf("--city");
  const only = cityArg >= 0 ? process.argv[cityArg + 1] : null;
  const cities = only ? EGYPT_CITIES.filter((c) => c.citySlug === only) : EGYPT_CITIES;
  if (only && cities.length === 0) throw new Error(`unknown city: ${only}`);

  for (const city of cities) {
    const months = await fetchCity(city);
    const outDir = mosqueDataFsDir(ROOT, city.mosqueSlug, { countryCode: "eg", citySlug: city.citySlug });
    mkdirSync(outDir, { recursive: true });
    for (let mi = 0; mi < 12; mi++) {
      const file = join(outDir, `${MONTH_NAMES_UPPER[mi].toLowerCase()}.json`);
      writeFileSync(
        file,
        `${JSON.stringify(
          { month: MONTH_NAMES_UPPER[mi], prayer_times: months[mi], iqamah_times: [], jummah_iqamah: "" },
          null,
          2,
        )}\n`,
      );
    }
    process.stderr.write(`${city.cityName}: wrote 12 months\n`);
  }

  updateRegistry(cities.map(registryEntry));
  process.stderr.write("Registry updated with ESA source\n");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
