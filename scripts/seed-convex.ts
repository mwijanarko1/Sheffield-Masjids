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
 *   bun scripts/seed-convex.ts                 # full seed — all mosques, all months (dev)
 *   bun scripts/seed-convex.ts --prod          # full seed (production URL)
 *   bun scripts/seed-convex.ts --changed       # only JSON changed vs HEAD (+ untracked under mosques/)
 *   bun scripts/seed-convex.ts --months 4,5    # only those months, every mosque
 *   npm run seed:dev -- --changed --months april
 */

import { ConvexHttpClient } from "convex/browser";
import { execFileSync } from "child_process";
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

/** Lowercase English month file stem → 1–12 */
const MONTH_NAME_TO_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(MONTH_FILES).map(([n, name]) => [name.toLowerCase(), Number(n)])
);

type ChangedPlan = {
  registryChanged: boolean;
  dstChanged: boolean;
  /** slug → month numbers touched */
  monthlyBySlug: Map<string, Set<number>>;
  ramadanSlugs: Set<string>;
};

function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Paths differing from HEAD plus untracked JSON under public/data/mosques; `null` if git unavailable. */
function gitChangedAndUntrackedPaths(cwd: string): string[] | null {
  try {
    const diffOut = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      encoding: "utf-8",
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    const untrackedOut = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard", "--", "public/data/mosques"],
      { encoding: "utf-8", cwd, maxBuffer: 10 * 1024 * 1024 }
    );
    const lines = [...diffOut.split("\n"), ...untrackedOut.split("\n")]
      .map((l) => l.trim())
      .filter(Boolean)
      .map(normalizeRepoPath);
    return [...new Set(lines)];
  } catch {
    return null;
  }
}

function parseMonthToken(t: string): number | null {
  const s = t.trim().toLowerCase();
  if (/^\d{1,2}$/.test(s)) {
    const n = parseInt(s, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  return MONTH_NAME_TO_NUM[s] ?? null;
}

function parseMonthsCsv(arg: string): Set<number> {
  const set = new Set<number>();
  for (const part of arg.split(",")) {
    const n = parseMonthToken(part);
    if (n === null) throw new Error(`Invalid month: "${part.trim()}"`);
    set.add(n);
  }
  return set;
}

function parseChangedPaths(paths: string[]): ChangedPlan {
  const monthlyBySlug = new Map<string, Set<number>>();
  const ramadanSlugs = new Set<string>();
  let registryChanged = false;
  let dstChanged = false;

  for (const raw of paths) {
    const p = normalizeRepoPath(raw);
    if (p === "public/data/mosques.json") registryChanged = true;
    if (p === "public/docs/dst-start-end.json") dstChanged = true;

    const monthly = /^public\/data\/mosques\/([^/]+)\/(january|february|march|april|may|june|july|august|september|october|november|december)\.json$/i.exec(
      p
    );
    if (monthly) {
      const slug = monthly[1];
      const monthNum = MONTH_NAME_TO_NUM[monthly[2].toLowerCase()];
      if (monthNum) {
        if (!monthlyBySlug.has(slug)) monthlyBySlug.set(slug, new Set());
        monthlyBySlug.get(slug)!.add(monthNum);
      }
    }

    const ram = /^public\/data\/mosques\/([^/]+)\/ramadan\.json$/i.exec(p);
    if (ram) ramadanSlugs.add(ram[1]);
  }

  return { registryChanged, dstChanged, monthlyBySlug, ramadanSlugs };
}

function intersectMonthSets(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a].filter((x) => b.has(x)));
}

function parseCli(argv: string[]) {
  const isProd = argv.includes("--prod");
  const useChanged = argv.includes("--changed");
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: tsx scripts/seed-convex.ts [options]

  (default)   Seed all mosques, all months, ramadan where present, DST calendar.
  --prod        Use CONVEX_PROD_URL instead of dev.
  --changed     Only seed files that differ from HEAD or are untracked under public/data/mosques
                (requires git). Skips unchanged months.
  --months A,B  Comma-separated month numbers or names (e.g. 4,5 or april,may).
                With --changed: only applies to changed monthly files (intersection).
                Without --changed: only those months for every mosque.

Examples:
  tsx scripts/seed-convex.ts --changed
  tsx scripts/seed-convex.ts --changed --months april
  tsx scripts/seed-convex.ts --months 6,7,8`);
    process.exit(0);
  }

  let monthsCsv: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--months=")) monthsCsv = a.slice("--months=".length);
    else if (a === "--months" || a === "-m") monthsCsv = argv[i + 1];
  }
  const monthsOnly = monthsCsv ? parseMonthsCsv(monthsCsv) : null;
  return { isProd, useChanged, monthsOnly };
}

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
    jummah: z.string().optional(),
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
    citySlug: z.string().regex(MOSQUE_SLUG_RE).optional(),
    cityName: z.string().min(1).optional(),
    countryCode: z.string().min(2).optional(),
    countryName: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
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

/**
 * @param monthsOnly - if null, seed every month file that exists; otherwise only listed month numbers (1–12).
 */
async function seedMonthly(
  client: ConvexHttpClient,
  mosqueSlug: string,
  monthsOnly: Set<number> | null
) {
  const year = new Date().getFullYear();
  for (let monthNum = 1; monthNum <= 12; monthNum++) {
    if (monthsOnly && !monthsOnly.has(monthNum)) continue;

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
  const { isProd, useChanged, monthsOnly } = parseCli(process.argv.slice(2));

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

  let changedPlan: ChangedPlan | undefined;
  if (useChanged) {
    const paths = gitChangedAndUntrackedPaths(process.cwd());
    if (paths === null) {
      console.error("--changed requires git on PATH and a repository (failed to run git diff).");
      process.exit(1);
    }
    changedPlan = parseChangedPaths(paths);
    const hasWork =
      changedPlan.registryChanged ||
      changedPlan.dstChanged ||
      changedPlan.monthlyBySlug.size > 0 ||
      changedPlan.ramadanSlugs.size > 0;
    if (!hasWork) {
      console.log(
        "No changed mosque data vs HEAD (and no untracked files under public/data/mosques). Nothing to seed."
      );
      process.exit(0);
    }
    console.log("Incremental seed (--changed):\n");
    if (changedPlan.registryChanged) console.log("  • public/data/mosques.json");
    if (changedPlan.dstChanged) console.log("  • public/docs/dst-start-end.json");
    for (const [slug, nums] of [...changedPlan.monthlyBySlug.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      const m = [...nums].sort((x, y) => x - y);
      console.log(`  • ${slug}: ${m.map((n) => MONTH_FILES[n]).join(", ")}`);
    }
    for (const slug of [...changedPlan.ramadanSlugs].sort()) {
      console.log(`  • ${slug}: ramadan.json`);
    }
    console.log("");
  }

  console.log(`Seeding ${isProd ? "PRODUCTION" : "DEV"} (${convexUrl})\n`);
  const client = new ConvexHttpClient(convexUrl);

  let seededMosques: MosqueSeed[];
  if (!useChanged || changedPlan!.registryChanged) {
    seededMosques = await seedMosques(client);
  } else {
    const mosquesFile = path.join(process.cwd(), "public", "data", "mosques.json");
    seededMosques = parseJsonFile(mosquesFile, MosquesFileSchema).mosques;
    console.log("Skipping mosque registry (mosques.json unchanged)\n");
  }

  const mosquesDir = path.join(process.cwd(), "public", "data", "mosques");
  const filesystemSlugs = fs.readdirSync(mosquesDir).filter((f) => {
    const stat = fs.statSync(path.join(mosquesDir, f));
    return stat.isDirectory();
  });
  const seededSlugs = seededMosques.map((m) => m.slug);
  const mosqueSlugs = Array.from(new Set([...filesystemSlugs, ...seededSlugs]));

  console.log("Seeding Convex with prayer times...\n");

  const dstPath = path.join(process.cwd(), "public", "docs", "dst-start-end.json");
  if (!useChanged || changedPlan!.dstChanged) {
    if (fs.existsSync(dstPath)) {
      try {
        const dstRaw = JSON.parse(fs.readFileSync(dstPath, "utf-8")) as {
          uk_dst_dates: { year: number; start_date: string; end_date: string }[];
        };
        await client.mutation(api.seed.seedUkDstCalendar, {
          ukDstDates: dstRaw.uk_dst_dates,
        });
        console.log("UK DST calendar (BST start/end dates)\n  ✓ seeded\n");
      } catch (err) {
        console.error("  ✗ UK DST calendar:", err instanceof Error ? err.message : err);
      }
      await delay(200);
    } else {
      console.warn("public/docs/dst-start-end.json not found — skip UK DST seed\n");
    }
  } else {
    console.log("Skipping UK DST calendar (dst-start-end.json unchanged)\n");
  }

  if (useChanged) {
    const plan = changedPlan!;
    const slugs = new Set([...plan.monthlyBySlug.keys(), ...plan.ramadanSlugs]);
    for (const slug of [...slugs].sort()) {
      console.log(`Mosque: ${slug}`);
      if (plan.monthlyBySlug.has(slug)) {
        let months = new Set(plan.monthlyBySlug.get(slug)!);
        if (monthsOnly) months = intersectMonthSets(months, monthsOnly);
        if (months.size > 0) await seedMonthly(client, slug, months);
        else
          console.log(
            "  (skip monthly: no overlap with changed files and --months, or empty after filter)\n"
          );
      }
      if (plan.ramadanSlugs.has(slug)) await seedRamadan(client, slug);
      console.log("");
    }
  } else {
    for (const slug of mosqueSlugs) {
      console.log(`Mosque: ${slug}`);
      await seedMonthly(client, slug, monthsOnly);
      await seedRamadan(client, slug);
      console.log("");
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
