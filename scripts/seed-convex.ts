/**
 * Seed Convex with prayer times from public/data/mosques JSON files.
 *
 * Prerequisites:
 *   1. npm install convex
 *   2. npx convex dev (in another terminal - keep it running)
 *   3. NEXT_PUBLIC_CONVEX_URL in .env.local (added by convex dev)
 *
 * Run: npx tsx scripts/seed-convex.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

// Load .env.local so NEXT_PUBLIC_CONVEX_URL is available
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}
loadEnvLocal();

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

type MosqueSeed = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  slug: string;
  website?: string;
  isHidden?: boolean;
};
const upsertMosqueMutation = makeFunctionReference<"mutation">("mosques:upsert");

async function seedMosques(client: ConvexHttpClient): Promise<MosqueSeed[]> {
  const mosquesFile = path.join(process.cwd(), "public", "data", "mosques.json");
  const raw = fs.readFileSync(mosquesFile, "utf-8");
  const parsed = JSON.parse(raw) as { mosques?: MosqueSeed[] };
  const mosques = Array.isArray(parsed.mosques) ? parsed.mosques : [];

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

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

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

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

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
  const convexUrl =
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error(
      "Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL. Run 'npx convex dev' and add to .env.local"
    );
    process.exit(1);
  }

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
