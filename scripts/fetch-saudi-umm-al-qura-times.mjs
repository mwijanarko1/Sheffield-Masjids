#!/usr/bin/env node
/**
 * Saudi city prayer times from the official KACST Umm Al-Qura Calendar API.
 * One synthetic mosque entry per city, matching the existing UAE city pattern.
 *
 * Source: https://ummulqura.org.sa/en/prayer-times
 * API: https://umqserv.kacst.gov.sa/api/v1/Prayer/GetPrayerByYear
 *
 * Run from repo root:
 *   node scripts/fetch-saudi-umm-al-qura-times.mjs
 *   node scripts/fetch-saudi-umm-al-qura-times.mjs --city riyadh
 *   node scripts/fetch-saudi-umm-al-qura-times.mjs --update-registry
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mosqueDataFsDir } from "./lib/mosque-data-path.mjs";
import { normalizeHHMM } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_URL = "https://umqserv.kacst.gov.sa/api/v1/Prayer/GetPrayerByYear";
const USER_AGENT = "Sheffield-Masjids/1.0 (+https://github.com/)";

const CITIES = [
  { citySlug: "riyadh", cityName: "Riyadh", lat: 24.67, lng: 46.69 },
  { citySlug: "jeddah", cityName: "Jeddah", lat: 21.5, lng: 39.17 },
  { citySlug: "makkah", cityName: "Makkah", lat: 21.426666, lng: 39.831666 },
  { citySlug: "madinah", cityName: "Madinah", lat: 24.54, lng: 39.63 },
  { citySlug: "dammam", cityName: "Dammam", lat: 26.44, lng: 50.1 },
  { citySlug: "taif", cityName: "Taif", lat: 21.25, lng: 40.4 },
  { citySlug: "tabuk", cityName: "Tabuk", lat: 28.4, lng: 36.58 },
  { citySlug: "buraydah", cityName: "Buraydah", lat: 26.35, lng: 43.96 },
  { citySlug: "khamis-mushait", cityName: "Khamis Mushait", lat: 18.31, lng: 42.73 },
  { citySlug: "abha", cityName: "Abha", lat: 18.22, lng: 42.51 },
  { citySlug: "hail", cityName: "Hail", lat: 27.52, lng: 41.7 },
  { citySlug: "jubail", sourceSlug: "al-jubail", cityName: "Jubail", lat: 27, lng: 49.66 },
  { citySlug: "najran", cityName: "Najran", lat: 17.52, lng: 44.2 },
  { citySlug: "hofuf", sourceSlug: "al-hofuf", cityName: "Hofuf", lat: 25.408, lng: 49.6132 },
  { citySlug: "jazan", cityName: "Jazan", lat: 16.89, lng: 42.54 },
].map((city) => ({ ...city, mosqueSlug: `${city.citySlug}-mosques` }));

const MONTHS = [
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

function parseArgs(argv) {
  const citySlugs = [];
  let updateRegistry = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--update-registry") updateRegistry = true;
    else if (argv[i] === "--city" && argv[i + 1]) citySlugs.push(argv[++i].toLowerCase());
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: node scripts/fetch-saudi-umm-al-qura-times.mjs [--city <slug>] [--update-registry]");
      console.log(`Cities: ${CITIES.map((city) => city.citySlug).join(", ")}`);
      process.exit(0);
    }
  }
  return { citySlugs, updateRegistry };
}

async function fetchYear(city, year) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    yg: String(year),
    lat: String(city.lat),
    lon: String(city.lng),
    zone: "3",
    lang: "en",
    format: "24",
  });
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Umm Al-Qura API HTTP ${response.status} for ${city.cityName}: ${text.slice(0, 200)}`);
  }

  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    throw new Error(`Umm Al-Qura API returned non-JSON for ${city.cityName}`);
  }
  if (!Array.isArray(rows)) throw new Error(`Umm Al-Qura API returned no schedule for ${city.cityName}`);
  return rows;
}

function buildMonthlyJson(rows, monthIndex) {
  return {
    month: MONTHS[monthIndex],
    prayer_times: rows.map((row) => ({
      date: Number(row.gregorianDate.day),
      fajr: normalizeHHMM(row.prayerTimes.fajr),
      shurooq: normalizeHHMM(row.prayerTimes.sunrise),
      dhuhr: normalizeHHMM(row.prayerTimes.dhuhr),
      asr: normalizeHHMM(row.prayerTimes.asr),
      maghrib: normalizeHHMM(row.prayerTimes.maghrib),
      isha: normalizeHHMM(row.prayerTimes.isha),
    })),
    iqamah_times: [],
    jummah_iqamah: "",
  };
}

function registryEntry(city) {
  return {
    id: city.mosqueSlug,
    name: `${city.cityName} Prayer Times`,
    address: `${city.cityName}, Saudi Arabia`,
    lat: city.lat,
    lng: city.lng,
    slug: city.mosqueSlug,
    citySlug: city.citySlug,
    cityName: city.cityName,
    countryCode: "SA",
    countryName: "Saudi Arabia",
    timezone: "Asia/Riyadh",
    isHidden: false,
    website: `https://ummulqura.org.sa/en/prayer-times/${city.sourceSlug ?? city.citySlug}`,
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

async function fetchCity(city, year) {
  const rows = await fetchYear(city, year);
  const expectedDays = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  if (rows.length !== expectedDays) {
    throw new Error(`${city.cityName}: expected ${expectedDays} days, got ${rows.length}`);
  }

  const outDir = mosqueDataFsDir(ROOT, city.mosqueSlug, {
    countryCode: "sa",
    citySlug: city.citySlug,
  });
  mkdirSync(outDir, { recursive: true });

  for (let monthIndex = 0; monthIndex < MONTHS.length; monthIndex++) {
    const monthRows = rows.filter((row) => Number(row.gregorianDate?.month) === monthIndex + 1);
    const expectedMonthDays = new Date(year, monthIndex + 1, 0).getDate();
    if (monthRows.length !== expectedMonthDays) {
      throw new Error(`${city.cityName} ${MONTHS[monthIndex]}: expected ${expectedMonthDays} days, got ${monthRows.length}`);
    }
    const monthly = buildMonthlyJson(monthRows, monthIndex);
    const file = join(outDir, `${MONTHS[monthIndex].toLowerCase()}.json`);
    writeFileSync(file, `${JSON.stringify(monthly, null, 2)}\n`);
    process.stderr.write(`${city.cityName}: wrote ${MONTHS[monthIndex].toLowerCase()} (${monthRows.length} days)\n`);
  }

  return registryEntry(city);
}

async function main() {
  const { citySlugs, updateRegistry: shouldUpdateRegistry } = parseArgs(process.argv.slice(2));
  const year = process.env.YEAR ? Number(process.env.YEAR) : new Date().getFullYear();
  if (!Number.isInteger(year)) throw new Error(`Invalid YEAR: ${process.env.YEAR}`);

  const selected = citySlugs.length
    ? CITIES.filter((city) => citySlugs.includes(city.citySlug))
    : CITIES;
  if (!selected.length) throw new Error(`No matching city for: ${citySlugs.join(", ")}`);

  const entries = [];
  for (const city of selected) entries.push(await fetchCity(city, year));
  if (shouldUpdateRegistry) updateRegistry(entries);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
