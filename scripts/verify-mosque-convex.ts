/**
 * Verify a mosque exists in Convex (what Masjidly reads).
 * Does NOT use sheffieldmasjids.com static JSON (that only updates after deploy).
 *
 * Usage:
 *   npx tsx scripts/verify-mosque-convex.ts --slug moorlands-islamic-centre
 *   npx tsx scripts/verify-mosque-convex.ts --slug moorlands-islamic-centre --prod
 *
 * Env (.env.local):
 *   Dev:  CONVEX_URL or NEXT_PUBLIC_CONVEX_URL
 *   Prod: CONVEX_PROD_URL
 * No admin secret required (public queries only).
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

import { readFileSync, existsSync } from "fs";
function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const MONTHS = [
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
] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const slug = (arg("--slug") || "").trim().toLowerCase();
  const year = Number(arg("--year") || new Date().getFullYear());
  const prod = process.argv.includes("--prod");
  if (!slug) {
    console.error("Usage: npx tsx scripts/verify-mosque-convex.ts --slug <slug> [--prod] [--year 2026]");
    process.exit(2);
  }

  const convexUrl = prod
    ? (process.env.CONVEX_PROD_URL || "").trim()
    : (process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "").trim();
  if (!convexUrl) {
    console.error(prod ? "Missing CONVEX_PROD_URL in .env.local" : "Missing CONVEX_URL / NEXT_PUBLIC_CONVEX_URL");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  const listed = await client.query(api.mosques.list, {});
  const hit = listed.find((m) => m.slug === slug);
  if (!hit) {
    console.error(JSON.stringify({ ok: false, slug, reason: "mosque not in Convex list", host: new URL(convexUrl).host }, null, 2));
    process.exit(1);
  }

  const coverage: Record<string, number> = {};
  let missingMonths = 0;
  for (const month of MONTHS) {
    const d = await client.query(api.prayerTimes.getMonthly, { mosqueSlug: slug, month, year });
    const n = Array.isArray(d?.prayer_times) ? d.prayer_times.length : 0;
    coverage[month] = n;
    if (n === 0) missingMonths += 1;
  }

  const ok = missingMonths === 0;
  console.log(
    JSON.stringify(
      {
        ok,
        slug,
        name: hit.name,
        city: hit.cityName,
        website: hit.website,
        hidden: hit.isHidden,
        year,
        host: new URL(convexUrl).host,
        missingMonths,
        coverage,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
