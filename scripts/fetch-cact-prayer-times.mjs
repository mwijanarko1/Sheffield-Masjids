#!/usr/bin/env node
/**
 * Fetches Castle Asian Community Trust (Sheffield) prayer data from mosqueprayertimes.org:
 * adhan (`prayers-ajax-list`) and iqamah (`mosques-ajax-list`). Same flow as Grand Mosque / FPCC.
 *
 * `mosque-id` header: asset URLs on the site use `mosques/65/...` (logo/gallery). The page
 * still embeds `'11'` in JS; we send **65** to match the tenant. Rows include `mosque_id` when
 * data exists.
 *
 * Important: As of 2026-04, the API returned **zero rows for every month** (probed mosque-id
 * 1–120 × April). The live [prayer-times page](https://cact.mosqueprayertimes.org/prayer-times)
 * shows the shell but no timetable until the centre publishes times in the mosque admin. This
 * script exits with code 1 if **no month** returns any rows so you do not commit empty exports.
 *
 * Run: node scripts/fetch-cact-prayer-times.mjs
 * On success writes: public/data/mosques/castle-asian-community-centre/{january..december}.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMonthlyMosqueJson, monthFileName } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BASE = "https://cact.mosqueprayertimes.org";
const MOSQUE_ID = "65";
const SLUG = "castle-asian-community-centre";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function cookieHeaderFromSetCookie(setCookie) {
  if (!setCookie) return "";
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr
    .map((c) => String(c).split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookieHeader(existing, setCookie) {
  const next = cookieHeaderFromSetCookie(setCookie);
  if (!next) return existing;
  if (!existing) return next;
  const map = new Map();
  for (const part of existing.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) map.set(k, rest.join("="));
  }
  for (const part of next.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) map.set(k, rest.join("="));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function extractCsrf(html) {
  const m = html.match(/name="csrf-token"[^>]*content="([^"]+)"/i);
  return m ? m[1] : null;
}

async function fetchWithCookies(url, opts = {}, cookieJar = "") {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...opts.headers,
      ...(cookieJar ? { Cookie: cookieJar } : {}),
    },
  });
  const raw = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
  const merged = mergeCookieHeader(cookieJar, raw);
  return { res, mergedCookies: merged || cookieJar, newCookies: raw };
}

async function openSession() {
  const { res, mergedCookies } = await fetchWithCookies(`${BASE}/prayer-times`, {
    redirect: "follow",
  });
  const html = await res.text();
  const csrf = extractCsrf(html);
  if (!csrf) throw new Error("Could not parse csrf-token from /prayer-times");
  if (!mergedCookies) throw new Error("No session cookie from /prayer-times");
  return { cookieJar: mergedCookies, csrf, html };
}

async function setSessionMonth(cookieJar, csrf, month1to12) {
  const body = new URLSearchParams({ _token: csrf, month: String(month1to12) });
  const { mergedCookies } = await fetchWithCookies(
    `${BASE}/setsessionprayer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrf,
        "mosque-id": MOSQUE_ID,
      },
      body: body.toString(),
    },
    cookieJar
  );
  return mergedCookies;
}

async function postJson(cookieJar, csrf, path, extra = {}) {
  const body = new URLSearchParams({ _token: csrf, draw: "1", ...extra });
  const { res, mergedCookies } = await fetchWithCookies(
    `${BASE}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrf,
        "mosque-id": MOSQUE_ID,
      },
      body: body.toString(),
    },
    cookieJar
  );
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return { json, mergedCookies };
}

async function fetchMonth(cookieJar, csrf, month1to12) {
  let jar = await setSessionMonth(cookieJar, csrf, month1to12);
  const prayers = await postJson(jar, csrf, "/prayers-ajax-list");
  jar = prayers.mergedCookies;
  const mosques = await postJson(jar, csrf, "/mosques-ajax-list");
  return {
    month: month1to12,
    prayers: prayers.json,
    iqamah: mosques.json,
    cookieJar: mosques.mergedCookies,
  };
}

function main() {
  const year = process.env.YEAR ? Number(process.env.YEAR) : new Date().getFullYear();
  const outDir = process.env.OUT_DIR
    ? join(ROOT, process.env.OUT_DIR)
    : join(ROOT, "public", "data", "mosques", SLUG);

  return (async () => {
    const { cookieJar, csrf } = await openSession();
    let jar = cookieJar;

    const pending = [];

    for (let m = 1; m <= 12; m++) {
      process.stderr.write(`Fetching ${MONTH_NAMES[m - 1]} (${m})… `);
      const data = await fetchMonth(jar, csrf, m);
      jar = data.cookieJar;

      const adhanRows = data.prayers.data ?? data.prayers;
      const rowCount = Array.isArray(adhanRows) ? adhanRows.length : 0;
      const iqamahRows = data.iqamah.data ?? data.iqamah;

      pending.push({ m, adhanRows, iqamahRows, rowCount });
      process.stderr.write(`ok (${rowCount} days)\n`);
    }

    const monthsWithData = pending.filter((p) => p.rowCount > 0).length;
    if (monthsWithData === 0) {
      process.stderr.write(
        "\nNo prayer rows returned for any month. The Castle Asian Community Trust timetable " +
          "does not appear to be published in the mosqueprayertimes.org backend yet. " +
          "Re-run after the centre uploads times, or verify in a browser.\n"
      );
      process.exit(1);
    }

    mkdirSync(outDir, { recursive: true });

    for (const { m, adhanRows, iqamahRows } of pending) {
      const monthly = buildMonthlyMosqueJson(adhanRows, iqamahRows, m, year);
      const file = join(outDir, monthFileName(m));
      writeFileSync(file, JSON.stringify(monthly, null, 2) + "\n", "utf-8");
    }

    process.stderr.write(`Wrote ${outDir}/ (12 monthly files)\n`);
  })();
}

main();
