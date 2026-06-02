/**
 * Cleanup orphaned mosque entries from Convex databases.
 *
 * Removes any mosque in the database whose slug does not appear in
 * the current public/data/mosques.json registry.
 *
 * Usage:
 *   bun scripts/cleanup-orphan-mosques.ts          # cleanup dev
 *   bun scripts/cleanup-orphan-mosques.ts --prod   # cleanup prod
 *   bun scripts/cleanup-orphan-mosques.ts --both   # cleanup both
 */

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { loadEnvConfig } from "@next/env";
import * as fs from "fs";
import * as path from "path";

loadEnvConfig(process.cwd());

const removeMosqueMutation = makeFunctionReference<"mutation">("mosques:removeBySlug");

async function cleanup(convexUrl: string, label: string) {
  console.log(`\n=== Cleaning up ${label} (${convexUrl}) ===\n`);

  const client = new ConvexHttpClient(convexUrl);

  // 1. Get valid slugs from mosques.json
  const mosquesFile = path.join(process.cwd(), "public", "data", "mosques.json");
  const registry = JSON.parse(fs.readFileSync(mosquesFile, "utf-8"));
  const validSlugs = new Set(registry.mosques.map((m: any) => m.slug));
  console.log(`Valid slugs from mosques.json: ${validSlugs.size}`);

  // 2. Get all slugs currently in the database
  const listMosquesQuery = makeFunctionReference<"query">("mosques:list");
  const dbMosques: any[] = await client.query(listMosquesQuery, {});
  console.log(`Total mosques in DB: ${dbMosques.length}`);

  // 3. Find orphans
  const orphans = dbMosques.filter((m) => !validSlugs.has(m.slug));
  console.log(`Orphaned entries to remove: ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log("✓ Nothing to clean up.");
    return;
  }

  // 4. Delete each orphan
  for (const m of orphans) {
    try {
      const result = await client.mutation(removeMosqueMutation, { slug: m.slug });
      console.log(`  ✗ Deleted: ${m.slug} (${m.name})`);
    } catch (err) {
      console.error(`  ✗ Failed: ${m.slug} —`, err instanceof Error ? err.message : err);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  // 5. Verify
  const remaining: any[] = await client.query(listMosquesQuery, {});
  const stillOrphaned = remaining.filter((m) => !validSlugs.has(m.slug));
  console.log(`\n✓ Cleanup complete. Remaining in DB: ${remaining.length}, still orphaned: ${stillOrphaned.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const doProd = args.includes("--prod") || args.includes("--both");
  const doDev = !args.includes("--prod") || args.includes("--both");

  const devUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const prodUrl = process.env.CONVEX_PROD_URL;

  if (doDev) {
    if (!devUrl) {
      console.error("Missing CONVEX_URL / NEXT_PUBLIC_CONVEX_URL");
      process.exit(1);
    }
    await cleanup(devUrl, "DEV");
  }

  if (doProd) {
    if (!prodUrl) {
      console.error("Missing CONVEX_PROD_URL");
      process.exit(1);
    }
    await cleanup(prodUrl, "PROD");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
