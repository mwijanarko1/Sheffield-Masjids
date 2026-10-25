import { NextRequest, NextResponse } from "next/server";
import mosquesData from "../../../../public/data/mosques.json";
import { loadMonthlyPrayerTimes, loadRamadanCalendar } from "@/lib/prayer-times";
import { publishedDateWindow } from "@/lib/published-prayer-times";
import {
  checkSharedRateLimit,
  rateLimitHeaders,
  retryAfterSeconds,
} from "@/lib/request-rate-limit";

/**
 * Same-origin timetable feed for the site's own client components
 * (monthly table, home widget, compare page, Ramadan table).
 *
 * It runs the server data path in src/lib/prayer-times.ts (Convex with the
 * server-only read secret, repo JSON fallback), so browsers get Convex data
 * without the Convex URL ever being shipped to them.
 *
 * Inputs are strict so the CDN cache cannot be bypassed: only registry slugs,
 * months 1 to 12, years in the published window, and no extra query params.
 *   GET /api/timetable?mosque={slug}&month={1-12}&year={YYYY}  -> { monthly }
 *   GET /api/timetable?mosque={slug}&ramadan=1                 -> { ramadan }
 */
export const runtime = "nodejs";

const RATE_LIMIT = 240;
const RATE_WINDOW_MS = 60_000;
const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";
const MONTHLY_PARAMS = new Set(["mosque", "month", "year"]);
const RAMADAN_PARAMS = new Set(["mosque", "ramadan"]);
const REGISTRY_SLUGS = new Set((mosquesData.mosques ?? []).map((mosque) => mosque.slug));

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

function hasOnly(params: URLSearchParams, allowed: Set<string>): boolean {
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (!allowed.has(key) || seen.has(key)) return false;
    seen.add(key);
  }
  return seen.size === allowed.size;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const slug = params.get("mosque") ?? "";
  if (!REGISTRY_SLUGS.has(slug)) return badRequest("Unknown mosque.");

  const isRamadan = params.has("ramadan");
  if (!hasOnly(params, isRamadan ? RAMADAN_PARAMS : MONTHLY_PARAMS)) {
    return badRequest("Unexpected query parameters.");
  }

  let month = 0;
  let year = 0;
  if (isRamadan) {
    if (params.get("ramadan") !== "1") return badRequest("ramadan must be 1.");
  } else {
    const monthText = params.get("month") ?? "";
    const yearText = params.get("year") ?? "";
    if (!/^(?:[1-9]|1[0-2])$/.test(monthText)) return badRequest("month must be 1 to 12.");
    if (!/^\d{4}$/.test(yearText)) return badRequest("year must be YYYY.");
    month = Number(monthText);
    year = Number(yearText);
    const { minYear, maxYear } = publishedDateWindow();
    if (year < minYear || year > maxYear) {
      return badRequest(`year must be between ${minYear} and ${maxYear}.`);
    }
  }

  const rate = await checkSharedRateLimit({
    scope: "timetable",
    headers: request.headers,
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = rateLimitHeaders(RATE_LIMIT, rate);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in one minute." },
      { status: 429, headers: { ...headers, "Retry-After": retryAfterSeconds(rate.resetAt) } },
    );
  }

  try {
    if (isRamadan) {
      const ramadan = await loadRamadanCalendar(slug);
      return NextResponse.json({ ramadan }, { headers: { ...headers, "Cache-Control": CACHE } });
    }
    const monthly = await loadMonthlyPrayerTimes(slug, month, year);
    return NextResponse.json({ monthly }, { headers: { ...headers, "Cache-Control": CACHE } });
  } catch {
    return NextResponse.json(
      { error: "Timetable not available." },
      { status: 404, headers },
    );
  }
}
