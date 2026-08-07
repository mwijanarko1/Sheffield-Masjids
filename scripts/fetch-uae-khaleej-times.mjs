#!/usr/bin/env node
/**
 * UAE emirate prayer times from Khaleej Times content API.
 * One synthetic mosque per emirate (city-level adhan; no iqamah).
 *
 * API: GET https://www.khaleejtimes.com/contentapi/v1/prayertimings?location={slug}
 * Source pages: https://www.khaleejtimes.com/prayer-time-uae/{slug}
 *
 * Limitation: the API returns only the current Gregorian month (no month/year params).
 * Re-run monthly to accumulate a full year, or use another official source for gaps.
 *
 * Run from repo root:
 *   node scripts/fetch-uae-khaleej-times.mjs
 *   node scripts/fetch-uae-khaleej-times.mjs --city dubai
 *   node scripts/fetch-uae-khaleej-times.mjs --update-registry
 *
 * Writes: public/data/mosques/ae/{citySlug}/{citySlug}-mosques/{month}.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mosqueDataFsDir } from "./lib/mosque-data-path.mjs";
import { normalizeHHMM } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const API_BASE = "https://www.khaleejtimes.com/contentapi/v1/prayertimings";
const USER_AGENT = "Sheffield-Masjids/1.0 (+https://github.com/)";

/** @type {const} */
const UAE_CITIES = [
  {
    locationSlug: "abu-dhabi",
    citySlug: "abu-dhabi",
    cityName: "Abu Dhabi",
    mosqueSlug: "abu-dhabi-mosques",
    name: "Abu Dhabi Prayer Times",
    lat: 24.4539,
    lng: 54.3773,
  },
  {
    locationSlug: "ajman",
    citySlug: "ajman",
    cityName: "Ajman",
    mosqueSlug: "ajman-mosques",
    name: "Ajman Prayer Times",
    lat: 25.4052,
    lng: 55.5136,
  },
  {
    locationSlug: "dubai",
    citySlug: "dubai",
    cityName: "Dubai",
    mosqueSlug: "dubai-mosques",
    name: "Dubai Prayer Times",
    lat: 25.2048,
    lng: 55.2708,
  },
  {
    locationSlug: "fujairah",
    citySlug: "fujairah",
    cityName: "Fujairah",
    mosqueSlug: "fujairah-mosques",
    name: "Fujairah Prayer Times",
    lat: 25.1288,
    lng: 56.3265,
  },
  {
    locationSlug: "ras-al-khaimah",
    citySlug: "ras-al-khaimah",
    cityName: "Ras Al Khaimah",
    mosqueSlug: "ras-al-khaimah-mosques",
    name: "Ras Al Khaimah Prayer Times",
    lat: 25.7895,
    lng: 55.9432,
  },
  {
    locationSlug: "sharjah",
    citySlug: "sharjah",
    cityName: "Sharjah",
    mosqueSlug: "sharjah-mosques",
    name: "Sharjah Prayer Times",
    lat: 25.3463,
    lng: 55.4209,
  },
  {
    locationSlug: "umm-al-quwain",
    citySlug: "umm-al-quwain",
    cityName: "Umm Al Quwain",
    mosqueSlug: "umm-al-quwain-mosques",
    name: "Umm Al Quwain Prayer Times",
    lat: 25.5647,
    lng: 55.5552,
  },
];

const MONTH_NAMES_UPPER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const MONTH_NAMES_LOWER = MONTH_NAMES_UPPER.map((m) => m.toLowerCase());

function parseArgs(argv) {
  const cities = [];
  let updateRegistry = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--update-registry") updateRegistry = true;
    else if (a === "--city" && argv[i + 1]) {
      cities.push(argv[++i].toLowerCase());
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/fetch-uae-khaleej-times.mjs [--city <slug>] [--update-registry]`);
      console.log(`Cities: ${UAE_CITIES.map((c) => c.citySlug).join(", ")}`);
      process.exit(0);
    }
  }
  return { cities, updateRegistry };
}

function monthNameToIndex(name) {
  const i = MONTH_NAMES_LOWER.indexOf(String(name).trim().toLowerCase());
  if (i < 0) throw new Error(`Unknown month name from API: ${name}`);
  return i;
}

function daysInMonth(month1to12, year) {
  return new Date(year, month1to12, 0).getDate();
}

async function fetchKhaleejMonth(locationSlug) {
  const url = `${API_BASE}?location=${encodeURIComponent(locationSlug)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Khaleej Times API HTTP ${res.status} for ${locationSlug}: ${text.slice(0, 200)}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Khaleej Times API returned non-JSON for ${locationSlug}`);
  }
  if (payload?.status !== true || !payload?.data?.timings?.length) {
    throw new Error(
      `Khaleej Times API empty/failed for ${locationSlug}: ${payload?.message ?? "no data"}`
    );
  }
  return payload.data;
}

function buildMonthlyJson(timings, monthName) {
  const monthIndex = monthNameToIndex(monthName);
  const prayer_times = timings
    .map((row) => {
      const t = row.timings ?? {};
      return {
        date: row.day,
        fajr: normalizeHHMM(t.fajr),
        shurooq: normalizeHHMM(t.sunrise),
        dhuhr: normalizeHHMM(t.dhuhr),
        asr: normalizeHHMM(t.asr),
        maghrib: normalizeHHMM(t.maghrib),
        isha: normalizeHHMM(t.isha),
      };
    })
    .sort((a, b) => a.date - b.date);

  return {
    month: MONTH_NAMES_UPPER[monthIndex],
    prayer_times,
    iqamah_times: [],
    jummah_iqamah: "",
  };
}

function registryEntry(city) {
  return {
    id: city.mosqueSlug,
    name: city.name,
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
    website: `https://www.khaleejtimes.com/prayer-time-uae/${city.locationSlug}`,
  };
}

function updateMosquesRegistry(entries) {
  const registryPath = join(ROOT, "public", "data", "mosques.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  const byId = new Map(registry.mosques.map((m) => [m.id, m]));
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  registry.mosques = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf-8");
  process.stderr.write(`Updated ${registryPath} (${entries.length} UAE entries)\n`);
}

async function fetchCity(city, year) {
  const data = await fetchKhaleejMonth(city.locationSlug);
  const monthIndex = monthNameToIndex(data.month);
  const monthFile = MONTH_NAMES_LOWER[monthIndex];
  const expectedDays = daysInMonth(monthIndex + 1, year);

  const monthly = buildMonthlyJson(data.timings, data.month);
  const outDir = mosqueDataFsDir(ROOT, city.mosqueSlug, {
    countryCode: "ae",
    citySlug: city.citySlug,
  });
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, `${monthFile}.json`);
  writeFileSync(outPath, JSON.stringify(monthly, null, 2) + "\n", "utf-8");

  const gotDays = monthly.prayer_times.length;
  const rel = `public/data/mosques/ae/${city.citySlug}/${city.mosqueSlug}/${monthFile}.json`;
  process.stderr.write(
    `${city.cityName}: wrote ${rel} (${gotDays}/${expectedDays} days, sample fajr day-1=${monthly.prayer_times[0]?.fajr})\n`
  );

  if (gotDays !== expectedDays) {
    process.stderr.write(
      `  WARNING: expected ${expectedDays} days for ${data.month} ${year}, got ${gotDays}\n`
    );
  }

  process.stderr.write(
    `  NOTE: Khaleej Times API only provides ${data.month}. Re-run monthly for other months.\n`
  );

  return registryEntry(city);
}

async function main() {
  const { cities: cityFilter, updateRegistry } = parseArgs(process.argv.slice(2));
  const year = process.env.YEAR ? Number(process.env.YEAR) : new Date().getFullYear();

  let selected = UAE_CITIES;
  if (cityFilter.length) {
    selected = UAE_CITIES.filter(
      (c) =>
        cityFilter.includes(c.citySlug) ||
        cityFilter.includes(c.locationSlug) ||
        cityFilter.includes(c.mosqueSlug)
    );
    if (!selected.length) {
      throw new Error(`No matching city for: ${cityFilter.join(", ")}`);
    }
  }

  const registryEntries = [];
  for (const city of selected) {
    registryEntries.push(await fetchCity(city, year));
  }

  if (updateRegistry) {
    updateMosquesRegistry(registryEntries);
  } else {
    process.stderr.write(
      "Registry not updated (pass --update-registry to merge public/data/mosques.json)\n"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
