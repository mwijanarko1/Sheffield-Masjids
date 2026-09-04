#!/usr/bin/env node
/**
 * Indonesian city prayer times sourced from Kemenag via the EQuran.id JSON API.
 * One synthetic mosque entry per city, matching the existing UAE city pattern.
 *
 * Source: https://equran.id/apidev/shalat
 * Official schedule: https://bimasislam.kemenag.go.id/jadwalshalat
 *
 * Run from repo root:
 *   node scripts/fetch-indonesia-kemenag-times.mjs
 *   node scripts/fetch-indonesia-kemenag-times.mjs --city jakarta
 *   node scripts/fetch-indonesia-kemenag-times.mjs --update-registry
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mosqueDataFsDir } from "./lib/mosque-data-path.mjs";
import { normalizeHHMM } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_URL = "https://equran.id/api/v2/shalat";
const USER_AGENT = "Sheffield-Masjids/1.0 (+https://github.com/)";

const CITIES = [
  {
    province: "DKI Jakarta",
    jurisdiction: "Kota Jakarta",
    citySlug: "jakarta",
    cityName: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Jawa Timur",
    jurisdiction: "Kota Surabaya",
    citySlug: "surabaya",
    cityName: "Surabaya",
    lat: -7.2575,
    lng: 112.7521,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Jawa Barat",
    jurisdiction: "Kota Bandung",
    citySlug: "bandung",
    cityName: "Bandung",
    lat: -6.9175,
    lng: 107.6191,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Sumatera Utara",
    jurisdiction: "Kota Medan",
    citySlug: "medan",
    cityName: "Medan",
    lat: 3.5952,
    lng: 98.6722,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Sulawesi Selatan",
    jurisdiction: "Kota Makassar",
    citySlug: "makassar",
    cityName: "Makassar",
    lat: -5.1477,
    lng: 119.4327,
    timezone: "Asia/Makassar",
  },
  {
    province: "Jawa Tengah",
    jurisdiction: "Kota Semarang",
    citySlug: "semarang",
    cityName: "Semarang",
    lat: -6.9667,
    lng: 110.4167,
    timezone: "Asia/Jakarta",
  },
  {
    province: "D.I. Yogyakarta",
    jurisdiction: "Kota Yogyakarta",
    citySlug: "yogyakarta",
    cityName: "Yogyakarta",
    lat: -7.7956,
    lng: 110.3695,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Sumatera Selatan",
    jurisdiction: "Kota Palembang",
    citySlug: "palembang",
    cityName: "Palembang",
    lat: -2.9761,
    lng: 104.7754,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Kepulauan Riau",
    jurisdiction: "Kota Batam",
    citySlug: "batam",
    cityName: "Batam",
    lat: 1.0456,
    lng: 104.0305,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Riau",
    jurisdiction: "Kota Pekanbaru",
    citySlug: "pekanbaru",
    cityName: "Pekanbaru",
    lat: 0.5071,
    lng: 101.4478,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Sumatera Barat",
    jurisdiction: "Kota Padang",
    citySlug: "padang",
    cityName: "Padang",
    lat: -0.9471,
    lng: 100.4172,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Lampung",
    jurisdiction: "Kota Bandar Lampung",
    citySlug: "bandar-lampung",
    cityName: "Bandar Lampung",
    lat: -5.3971,
    lng: 105.2668,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Jawa Timur",
    jurisdiction: "Kota Malang",
    citySlug: "malang",
    cityName: "Malang",
    lat: -7.9666,
    lng: 112.6326,
    timezone: "Asia/Jakarta",
  },
  {
    province: "Bali",
    jurisdiction: "Kota Denpasar",
    citySlug: "denpasar",
    cityName: "Denpasar",
    lat: -8.6705,
    lng: 115.2126,
    timezone: "Asia/Makassar",
  },
  {
    province: "Kalimantan Timur",
    jurisdiction: "Kota Samarinda",
    citySlug: "samarinda",
    cityName: "Samarinda",
    lat: -0.5022,
    lng: 117.1536,
    timezone: "Asia/Makassar",
  },
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
      console.log("Usage: node scripts/fetch-indonesia-kemenag-times.mjs [--city <slug>] [--update-registry]");
      console.log(`Cities: ${CITIES.map((city) => city.citySlug).join(", ")}`);
      process.exit(0);
    }
  }
  return { citySlugs, updateRegistry };
}

async function fetchMonth(city, month, year) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      provinsi: city.province,
      kabkota: city.jurisdiction,
      bulan: month,
      tahun: year,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`EQuran API HTTP ${response.status} for ${city.cityName}: ${text.slice(0, 200)}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`EQuran API returned non-JSON for ${city.cityName}`);
  }
  if (payload?.code !== 200 || !Array.isArray(payload?.data?.jadwal)) {
    throw new Error(`EQuran API returned no schedule for ${city.cityName}, month ${month}`);
  }
  return payload.data.jadwal;
}

function buildMonthlyJson(rows, monthIndex) {
  return {
    month: MONTHS[monthIndex],
    prayer_times: rows.map((row) => ({
      date: Number(row.tanggal),
      fajr: normalizeHHMM(row.subuh),
      shurooq: normalizeHHMM(row.terbit),
      dhuhr: normalizeHHMM(row.dzuhur),
      asr: normalizeHHMM(row.ashar),
      maghrib: normalizeHHMM(row.maghrib),
      isha: normalizeHHMM(row.isya),
    })),
    iqamah_times: [],
    jummah_iqamah: "",
  };
}

function registryEntry(city) {
  return {
    id: city.mosqueSlug,
    name: `${city.cityName} Prayer Times`,
    address: `${city.cityName}, Indonesia`,
    lat: city.lat,
    lng: city.lng,
    slug: city.mosqueSlug,
    citySlug: city.citySlug,
    cityName: city.cityName,
    countryCode: "ID",
    countryName: "Indonesia",
    timezone: city.timezone,
    isHidden: false,
    website: "https://bimasislam.kemenag.go.id/jadwalshalat",
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
    /[\u0080-\uffff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  writeFileSync(path, `${json}\n`);
}

async function fetchCity(city, year) {
  const outDir = mosqueDataFsDir(ROOT, city.mosqueSlug, {
    countryCode: "id",
    citySlug: city.citySlug,
  });
  mkdirSync(outDir, { recursive: true });

  for (let monthIndex = 0; monthIndex < MONTHS.length; monthIndex++) {
    const rows = await fetchMonth(city, monthIndex + 1, year);
    const expectedDays = new Date(year, monthIndex + 1, 0).getDate();
    if (rows.length !== expectedDays) {
      throw new Error(`${city.cityName} ${MONTHS[monthIndex]}: expected ${expectedDays} days, got ${rows.length}`);
    }
    const monthly = buildMonthlyJson(rows, monthIndex);
    const file = join(outDir, `${MONTHS[monthIndex].toLowerCase()}.json`);
    writeFileSync(file, `${JSON.stringify(monthly, null, 2)}\n`);
    process.stderr.write(`${city.cityName}: wrote ${MONTHS[monthIndex].toLowerCase()} (${rows.length} days)\n`);
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
