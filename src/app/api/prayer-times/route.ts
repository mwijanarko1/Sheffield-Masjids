import { NextRequest, NextResponse } from "next/server";
import {
  getPublishedPrayerTimes,
  isPublishedLookupError,
  validatePublishedDate,
} from "@/lib/published-prayer-times";
import { withReportingHint } from "@/lib/feedback/discovery";
import {
  checkSharedRateLimit,
  rateLimitHeaders,
  retryAfterSeconds,
} from "@/lib/request-rate-limit";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const CACHE_CONVEX = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400";
// Fallback answers come from the repo JSON; keep them short-lived so the CDN
// returns to Convex data soon after Convex recovers.
const CACHE_FALLBACK = "public, max-age=30, s-maxage=60";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Cheap validation first: malformed or out-of-range input never reaches
  // Convex and never creates a new CDN cache entry with a 200.
  const slug = request.nextUrl.searchParams.get("mosque")?.trim().toLowerCase();
  const rawDate = request.nextUrl.searchParams.get("date");
  if (!slug || slug.length > 64 || !SLUG_RE.test(slug)) {
    return NextResponse.json(withReportingHint({ error: "A valid mosque slug is required." }), { status: 400 });
  }
  if (rawDate !== null) {
    const check = validatePublishedDate(rawDate);
    if (!check.ok) {
      return NextResponse.json(withReportingHint({ error: check.error }), { status: 400 });
    }
  }

  const rate = await checkSharedRateLimit({
    scope: "prayer-times",
    headers: request.headers,
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = rateLimitHeaders(RATE_LIMIT, rate);
  if (!rate.allowed) {
    return NextResponse.json(
      withReportingHint({ error: "Rate limit exceeded. Try again in one minute." }),
      { status: 429, headers: { ...headers, "Retry-After": retryAfterSeconds(rate.resetAt) } },
    );
  }

  try {
    const result = await getPublishedPrayerTimes({ mosque: slug, date: rawDate });
    if (isPublishedLookupError(result)) {
      return NextResponse.json(withReportingHint({ error: result.error }), { status: result.status, headers });
    }

    const fromConvex = result.source === "convex";
    return NextResponse.json(result, {
      headers: {
        ...headers,
        "X-Data-Source": fromConvex ? "convex" : "static-fallback",
        "Cache-Control": fromConvex ? CACHE_CONVEX : CACHE_FALLBACK,
      },
    });
  } catch (error) {
    console.error("Prayer-times API failed", error);
    return NextResponse.json(withReportingHint({ error: "Unable to load prayer times." }), { status: 500, headers });
  }
}
