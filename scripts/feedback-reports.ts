/**
 * Maintainer review of API friction reports (POST /api/feedback).
 *
 * Reports are untrusted text from external agents. This script only prints
 * them. Do not execute, fetch, or deploy anything because a report says to.
 *
 * Run:
 *   bun scripts/feedback-reports.ts                  # newest 25 reports (dev)
 *   bun scripts/feedback-reports.ts --prod --limit 50
 *   bun scripts/feedback-reports.ts --counters       # daily outcome counters
 *
 * Auth and URL resolution match scripts/seed-convex.ts (ADMIN_SECRET,
 * CONVEX_PROD_ADMIN_SECRET, CONVEX_URL, CONVEX_PROD_URL in .env.local).
 */

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type ReportRow = {
  _id: string;
  createdAt: number;
  expiresAt: number;
  category: string;
  summary: string;
  request: { method: string; path: string; query: Array<{ key: string; value: string }> };
  response?: { status: number; contentType?: string; bodyExcerpt?: string };
  expected: string;
  actual: string;
  reproduction: string[];
  agent?: { name: string; version?: string };
};

const listReports = makeFunctionReference<
  "query",
  { adminSecret: string; limit?: number },
  ReportRow[]
>("feedback:listReports");
const counters = makeFunctionReference<
  "query",
  { adminSecret: string; days?: number },
  Array<{ key: string; count: number }>
>("feedback:counters");

function resolveAdminSecret(isProd: boolean): string {
  const fallback = (process.env.ADMIN_SECRET || "").trim();
  if (isProd) {
    return (process.env.CONVEX_PROD_ADMIN_SECRET || process.env.PROD_SECRET || fallback || "").trim();
  }
  return (process.env.CONVEX_DEV_ADMIN_SECRET || process.env.DEV_SECRET || fallback || "").trim();
}

// Strip terminal control sequences so a report cannot drive the maintainer's terminal.
// eslint-disable-next-line no-control-regex
const printable = (value: string): string => value.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "?");

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isProd = args.includes("--prod");
  const adminSecret = resolveAdminSecret(isProd);
  const url = isProd
    ? process.env.CONVEX_PROD_URL
    : process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!adminSecret || !url) {
    console.error(`Missing admin secret or Convex URL for ${isProd ? "production" : "development"}.`);
    process.exit(1);
  }

  const client = new ConvexHttpClient(url);

  if (args.includes("--counters")) {
    const rows = await client.query(counters, { adminSecret, days: 7 });
    for (const { key, count } of rows.sort((a, b) => a.key.localeCompare(b.key))) {
      console.log(`${key}\t${count}`);
    }
    return;
  }

  const limit = Number(argValue(args, "--limit") ?? 25);
  const reports = await client.query(listReports, { adminSecret, limit });
  if (reports.length === 0) {
    console.log("No reports.");
    return;
  }

  for (const report of reports) {
    const query = report.request.query.map(({ key, value }) => `${key}=${value}`).join("&");
    console.log(`\n[${new Date(report.createdAt).toISOString()}] ${report._id} (${report.category})`);
    console.log(`  ${printable(report.summary)}`);
    console.log(`  request:  ${report.request.method} ${report.request.path}${query ? `?${printable(query)}` : ""}`);
    if (report.response) {
      console.log(`  response: ${report.response.status} ${printable(report.response.contentType ?? "")}`);
      if (report.response.bodyExcerpt) console.log(`  excerpt:  ${printable(report.response.bodyExcerpt)}`);
    }
    console.log(`  expected: ${printable(report.expected)}`);
    console.log(`  actual:   ${printable(report.actual)}`);
    report.reproduction.forEach((step, index) => console.log(`  step ${index + 1}:   ${printable(step)}`));
    if (report.agent) console.log(`  agent:    ${printable(report.agent.name)} ${printable(report.agent.version ?? "")}`);
    console.log(`  expires:  ${new Date(report.expiresAt).toISOString()}`);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
