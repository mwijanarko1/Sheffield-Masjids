#!/usr/bin/env node
/**
 * UAE emirate prayer times from the official AWQAF (General Authority of
 * Islamic Affairs, Endowments & Zakat) API.
 *
 * API: https://mobileappapi.awqaf.gov.ae/APIS/
 *   POST v3/sso/StartRequest?lang=en          -> clientAccessToken (no credentials)
 *   GET  v3/prayer-time/prayertimes/{from}/{to} -> prayerData for all cities
 * Source page: https://www.awqaf.gov.ae/prayer-times
 *
 * NOTE: the API sits behind a WAF that rejects non-browser clients (TLS
 * fingerprinting). Plain node-fetch/curl get "Request Rejected". If that
 * happens, generate the data from the official site's browser session:
 * see the README-style steps at the bottom of this file.
 *
 * Run from repo root:
 *   node scripts/fetch-uae-awqaf-times.mjs            # all 7 emirates, current year
 *   node scripts/fetch-uae-awqaf-times.mjs --year 2026
 *   node scripts/fetch-uae-awqaf-times.mjs --from-browser /tmp/ae-raw.json
 *
 * Writes: public/data/mosques/ae/{citySlug}/{citySlug}-mosques/{month}.json
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { mosqueDataFsDir } from "./lib/mosque-data-path.mjs";
import { normalizeHHMM } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BASE = "https://mobileappapi.awqaf.gov.ae/APIS/";
const START_URL = `${BASE}v3/sso/StartRequest?lang=en`;
const PRAYER_URL = `${BASE}v3/prayer-time/prayertimes/`;
const WEBSITE = "https://www.awqaf.gov.ae/prayer-times?lang=en";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.awqaf.gov.ae",
  Referer: "https://www.awqaf.gov.ae/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

const UAE_CITIES = [
  { citySlug: "abu-dhabi", area: "Abu Dhabi", cityName: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { citySlug: "ajman", area: "Ajman", cityName: "Ajman", lat: 25.4052, lng: 55.5136 },
  { citySlug: "dubai", area: "Dubai", cityName: "Dubai", lat: 25.2048, lng: 55.2708 },
  { citySlug: "fujairah", area: "Fujairah", cityName: "Fujairah", lat: 25.1288, lng: 56.3265 },
  { citySlug: "ras-al-khaimah", area: "Ras AlKhaimah", cityName: "Ras Al Khaimah", lat: 25.7895, lng: 55.9432 },
  { citySlug: "sharjah", area: "Sharjah", cityName: "Sharjah", lat: 25.3463, lng: 55.4209 },
  { citySlug: "umm-al-quwain", area: "Um Al Quwain", cityName: "Umm Al Quwain", lat: 25.5647, lng: 55.5552 },
].map((c) => ({ ...c, mosqueSlug: `${c.citySlug}-mosques` }));

const MONTH_NAMES_UPPER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function parseArgs(argv) {
  let year = new Date().getFullYear();
  let fromBrowser = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--year" && argv[i + 1]) year = Number(argv[++i]);
    else if (argv[i] === "--from-browser" && argv[i + 1]) fromBrowser = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(
        "Usage: node scripts/fetch-uae-awqaf-times.mjs [--year 2026] [--from-browser <raw.json>]"
      );
      process.exit(0);
    }
  }
  return { year, fromBrowser };
}

function hm(iso) {
  if (!iso) return "";
  return iso.includes("T") ? iso.split("T")[1].slice(0, 5) : String(iso).slice(0, 5);
}

function isWafBlocked(text) {
  return /Request Rejected|support ID/i.test(text.slice(0, 400));
}

async function getToken() {
  const res = await fetch(START_URL, { method: "POST", headers: BROWSER_HEADERS });
  const text = await res.text();
  if (isWafBlocked(text)) {
    throw new Error(
      "AWQAF WAF rejected the request. This API only accepts real browser sessions " +
        "(TLS fingerprint check). Use --from-browser with data captured from " +
        "https://www.awqaf.gov.ae/prayer-times."
    );
  }
  const data = JSON.parse(text);
  if (!data.clientAccessToken) throw new Error("StartRequest returned no token: " + text.slice(0, 200));
  return data.clientAccessToken;
}

async function fetchMonth(token, year, month1to12) {
  const last = new Date(year, month1to12, 0).getDate();
  const rng = `${year}-${String(month1to12).padStart(2, "0")}-01/${year}-${String(month1to12).padStart(2, "0")}-${last}`;
  const res = await fetch(PRAYER_URL + rng, {
    headers: { ...BROWSER_HEADERS, Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok || isWafBlocked(text)) {
    throw new Error(`prayertimes ${rng} failed: HTTP ${res.status}`);
  }
  const data = JSON.parse(text);
  return data.prayerData || [];
}

function buildMonthly(monthRows, monthIndex, area) {
  const rows = monthRows
    .filter((r) => r.areaNameEn === area)
    .map((r) => ({
      date: Number(r.gDate.split("T")[0].slice(8, 10)),
      fajr: normalizeHHMM(hm(r.fajr)),
      shurooq: normalizeHHMM(hm(r.shurooq)),
      dhuhr: normalizeHHMM(hm(r.zuhr)),
      asr: normalizeHHMM(hm(r.asr)),
      maghrib: normalizeHHMM(hm(r.maghrib)),
      isha: normalizeHHMM(hm(r.isha)),
    }))
    .sort((a, b) => a.date - b.date);
  return {
    month: MONTH_NAMES_UPPER[monthIndex],
    prayer_times: rows,
    iqamah_times: [],
    jummah_iqamah: "",
  };
}

function writeFiles(cities, monthsData, year) {
  for (const city of cities) {
    const outDir = mosqueDataFsDir(ROOT, city.mosqueSlug, { countryCode: "ae", citySlug: city.citySlug });
    mkdirSync(outDir, { recursive: true });
    for (let mi = 0; mi < 12; mi++) {
      const monthly = monthsData[mi][city.citySlug];
      if (!monthly) continue;
      const file = join(outDir, `${MONTH_NAMES_UPPER[mi].toLowerCase()}.json`);
      writeFileSync(file, `${JSON.stringify(monthly, null, 2)}\n`);
    }
    process.stderr.write(`${city.cityName}: wrote 12 months (year ${year})\n`);
  }
}

function registryEntry(city) {
  return {
    id: city.mosqueSlug,
    name: `${city.cityName} Prayer Times`,
    address: `${city.cityName}, United Arab Emirates`,
    lat: city.lat,
    lng: city.lng,
    slug: city.mosqueSlug,
    citySlug: city.citySlug,
    cityName: city.cityName,
    countryCode: "AE",
    countryName: "United Arab Emirates",
    timezone: "Asia/Dubai",
    isHidden: false,
    website: WEBSITE,
  };
}

function updateRegistry(entries) {
  const path = join(ROOT, "public", "data", "mosques.json");
  const registry = JSON.parse(readFileSync(path, "utf-8"));
  for (const entry of entries) {
    const idx = registry.mosques.findIndex((m) => m.id === entry.id);
    if (idx >= 0) registry.mosques[idx] = entry;
    else registry.mosques.push(entry);
  }
  writeFileSync(path, `${JSON.stringify(registry, null, 2).replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)}\n`);
}

async function main() {
  const { year, fromBrowser } = parseArgs(process.argv.slice(2));

  let monthsData = [];
  if (fromBrowser) {
    // Raw dump: { months: { JANUARY: { citySlug: [ {date,fajr,shurooq,dhuhr,asr,maghrib,isha}, ... ] } } }
    const raw = JSON.parse(readFileSync(fromBrowser, "utf-8")).months;
    monthsData = MONTH_NAMES_UPPER.map((name) => {
      const byCity = {};
      for (const city of UAE_CITIES) {
        const rows = raw[name]?.[city.citySlug];
        if (!rows) throw new Error(`from-browser dump missing ${name}/${city.citySlug}`);
        byCity[city.citySlug] = {
          month: name,
          prayer_times: rows,
          iqamah_times: [],
          jummah_iqamah: "",
        };
      }
      return byCity;
    });
  } else {
    const token = await getToken();
    for (let mi = 1; mi <= 12; mi++) {
      const rows = await fetchMonth(token, year, mi);
      const byCity = {};
      for (const city of UAE_CITIES) {
        byCity[city.citySlug] = buildMonthly(rows, mi - 1, city.area);
      }
      monthsData.push(byCity);
      process.stderr.write(`fetched ${MONTH_NAMES_UPPER[mi - 1]} (${rows.length} rows)\n`);
    }
  }

  writeFiles(UAE_CITIES, monthsData, year);
  updateRegistry(UAE_CITIES.map(registryEntry));
  process.stderr.write("Registry updated with AWQAF source\n");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
