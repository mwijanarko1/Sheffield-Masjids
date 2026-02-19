/**
 * Seed Convex with prayer times from public/data/mosques JSON files.
 *
 * Prerequisites:
 *   1. npm install convex
 *   2. npx convex dev (in another terminal - keep it running for dev)
 *   3. NEXT_PUBLIC_CONVEX_URL in .env.local (added by convex dev)
 *
 * For production: add CONVEX_PROD_URL to .env.local (from Convex dashboard → Deployments → Production → URL)
 *
 * Run:
 *   npx tsx scripts/seed-convex.ts           # seeds dev (uses NEXT_PUBLIC_CONVEX_URL)
 *   npx tsx scripts/seed-convex.ts --prod   # seeds prod (uses CONVEX_PROD_URL)
 */

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

loadEnvConfig(process.cwd());

const MONTH_FILES: Record<number, string> = {
  1: "january",
  2: "february",
  3: "march",
  4: "april",
  5: "may",
  6: "june",
  7: "july",
  8: "august",
  9: "september",
  10: "october",
  11: "november",
  12: "december",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PrayerTimeSchema = z
  .object({
    date: z.number().int().min(1).max(31),
    fajr: z.string().min(1),
    shurooq: z.string().min(1),
    dhuhr: z.string().min(1),
    asr: z.string().min(1),
    maghrib: z.string().min(1),
    isha: z.string().min(1),
  })
  .passthrough();

const IqamahTimeRangeSchema = z
  .object({
    date_range: z.string().min(1),
    fajr: z.string().min(1),
    dhuhr: z.string().min(1),
    asr: z.string().min(1),
    isha: z.string().min(1),
    maghrib: z.string().optional(),
  })
  .passthrough();

const MosqueSeedSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    address: z.string().min(1),
    lat: z.number().finite(),
    lng: z.number().finite(),
    slug: z.string().regex(MOSQUE_SLUG_RE),
    website: z.string().optional(),
    isHidden: z.boolean().optional(),
  })
  .strict();

const MosquesFileSchema = z.object({
  mosques: z.array(MosqueSeedSchema),
});

const MonthlyFileSchema = z
  .object({
    month: z.string().min(1),
    prayer_times: z.array(PrayerTimeSchema),
    iqamah_times: z.array(IqamahTimeRangeSchema),
    jummah_iqamah: z.string().min(1),
  })
  .strict();

const RamadanPrayerTimeSchema = z
  .object({
    ramadan_day: z.number().int().min(1).max(30),
    gregorian: z.string().min(1),
    fajr: z.string().min(1),
    shurooq: z.string().min(1),
    dhuhr: z.string().min(1),
    asr: z.string().min(1),
    maghrib: z.string().min(1),
    isha: z.string().min(1),
  })
  .passthrough();

const RamadanFileSchema = z
  .object({
    month: z.string().min(1),
    gregorian_start: z.string().min(1),
    gregorian_end: z.string().min(1),
    prayer_times: z.array(RamadanPrayerTimeSchema),
    iqamah_times: z.array(IqamahTimeRangeSchema),
    jummah_iqamah: z.string().min(1),
  })
  .passthrough();

type MosqueSeed = z.infer<typeof MosqueSeedSchema>;
type MonthlyFile = z.infer<typeof MonthlyFileSchema>;
type RamadanFile = z.infer<typeof RamadanFileSchema>;

function parseJsonFile<T>(filePath: string, schema: z.ZodType<T>): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema validation failed for ${filePath}: ${result.error.message}`);
  }

  return result.data;
}
const upsertMosqueMutation = makeFunctionReference<"mutation">("mosques:upsert");

async function seedMosques(client: ConvexHttpClient): Promise<MosqueSeed[]> {
  const mosquesFile = path.join(process.cwd(), "public", "data", "mosques.json");
  const parsed = parseJsonFile(mosquesFile, MosquesFileSchema);
  const mosques = parsed.mosques;

  console.log("Seeding mosque registry...");
  for (const mosque of mosques) {
    try {
      await client.mutation(upsertMosqueMutation, mosque);
      console.log(`  ✓ ${mosque.slug}`);
    } catch (err) {
      console.error(`  ✗ ${mosque.slug}:`, err instanceof Error ? err.message : err);
    }
    await delay(100);
  }

  console.log("");
  return mosques;
}

async function seedMonthly(client: ConvexHttpClient, mosqueSlug: string) {
  const year = new Date().getFullYear();
  for (let monthNum = 1; monthNum <= 12; monthNum++) {
    const monthFile = MONTH_FILES[monthNum];
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "mosques",
      mosqueSlug,
      `${monthFile}.json`
    );
    if (!fs.existsSync(filePath)) continue;

    const data: MonthlyFile = parseJsonFile(filePath, MonthlyFileSchema);

    try {
      await client.mutation(api.seed.seedMonthly, {
        mosqueSlug,
        month: monthFile,
        year,
        monthDisplay: data.month,
        prayerTimes: data.prayer_times,
        iqamahTimes: data.iqamah_times,
        jummahIqamah: data.jummah_iqamah,
      });
      console.log(`  ✓ ${monthFile}`);
    } catch (err) {
      console.error(`  ✗ ${monthFile}:`, err instanceof Error ? err.message : err);
    }
    await delay(200);
  }
}

async function seedRamadan(client: ConvexHttpClient, mosqueSlug: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "mosques",
    mosqueSlug,
    "ramadan.json"
  );
  if (!fs.existsSync(filePath)) return;

  const data: RamadanFile = parseJsonFile(filePath, RamadanFileSchema);

  try {
    await client.mutation(api.seed.seedRamadan, {
      mosqueSlug,
      month: data.month,
      gregorianStart: data.gregorian_start,
      gregorianEnd: data.gregorian_end,
      prayerTimes: data.prayer_times,
      iqamahTimes: data.iqamah_times,
      jummahIqamah: data.jummah_iqamah,
    });
    console.log(`  ✓ ramadan`);
  } catch (err) {
    console.error(`  ✗ ramadan:`, err instanceof Error ? err.message : err);
  }
  await delay(200);
}

async function main() {
  const isProd = process.argv.includes("--prod");
  const convexUrl = isProd
    ? process.env.CONVEX_PROD_URL
    : process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    if (isProd) {
      console.error(
        "Missing CONVEX_PROD_URL. Add it to .env.local (from Convex dashboard → Deployments → Production → URL)"
      );
    } else {
      console.error(
        "Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL. Run 'npx convex dev' and add to .env.local"
      );
    }
    process.exit(1);
  }

  console.log(`Seeding ${isProd ? "PRODUCTION" : "DEV"} (${convexUrl})\n`);
  const client = new ConvexHttpClient(convexUrl);
  const seededMosques = await seedMosques(client);

  const mosquesDir = path.join(process.cwd(), "public", "data", "mosques");
  const filesystemSlugs = fs.readdirSync(mosquesDir).filter((f) => {
    const stat = fs.statSync(path.join(mosquesDir, f));
    return stat.isDirectory();
  });
  const seededSlugs = seededMosques.map((m) => m.slug);
  const mosqueSlugs = Array.from(new Set([...filesystemSlugs, ...seededSlugs]));

  console.log("Seeding Convex with prayer times...\n");

  for (const slug of mosqueSlugs) {
    console.log(`Mosque: ${slug}`);
    await seedMonthly(client, slug);
    await seedRamadan(client, slug);
    console.log("");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
