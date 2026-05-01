#!/usr/bin/env node
/**
 * Sheffield Ummah Center — mosqueprayertimes.org (adhan + iqamah AJAX).
 * CDN / API use `mosques/948`; send `mosque-id: 948`.
 *
 * Run: node scripts/fetch-ummah-center-prayer-times.mjs
 * Writes: public/data/mosques/sheffield-ummah-center/{january..december}.json
 *
 * https://ummahcenter.mosqueprayertimes.org/prayer-times
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMonthlyMosqueJson, monthFileName } from "./lib/mosqueprayertimes-to-monthly-json.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BASE = "https://ummahcenter.mosqueprayertimes.org";
const MOSQUE_ID = "948";
const SLUG = "sheffield-ummah-center";

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

  mkdirSync(outDir, { recursive: true });

  return (async () => {
    const { cookieJar, csrf } = await openSession();
    let jar = cookieJar;

    for (let m = 1; m <= 12; m++) {
      process.stderr.write(`Fetching ${MONTH_NAMES[m - 1]} (${m})… `);
      const data = await fetchMonth(jar, csrf, m);
      jar = data.cookieJar;

      const adhan_rows = data.prayers.data ?? data.prayers;
      const iqamah_rows = data.iqamah.data ?? data.iqamah;
      const monthly = buildMonthlyMosqueJson(adhan_rows, iqamah_rows, m, year);
      const file = join(outDir, monthFileName(m));
      writeFileSync(file, JSON.stringify(monthly, null, 2) + "\n", "utf-8");
      process.stderr.write(`ok → ${SLUG}/${monthFileName(m)} (${adhan_rows?.length ?? 0} days)\n`);
    }

    process.stderr.write(`Wrote ${outDir}/ (12 monthly files)\n`);
  })();
}

main();
