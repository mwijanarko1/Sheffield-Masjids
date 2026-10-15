import { NextRequest, NextResponse } from "next/server";
import {
  getPublishedPrayerTimes,
  isPublishedLookupError,
  parsePublishedDate,
} from "@/lib/published-prayer-times";
import { checkRequestRateLimit } from "@/lib/request-rate-limit";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function rateHeaders(remaining: number, resetAt: number) {
  return {
    "RateLimit-Limit": String(RATE_LIMIT),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = checkRequestRateLimit(clientKey(request), RATE_LIMIT, RATE_WINDOW_MS);
  const headers = rateHeaders(rate.remaining, rate.resetAt);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in one minute." },
      { status: 429, headers: { ...headers, "Retry-After": "60" } },
    );
  }

  const slug = request.nextUrl.searchParams.get("mosque")?.trim().toLowerCase();
  const rawDate = request.nextUrl.searchParams.get("date");
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "A valid mosque slug is required." }, { status: 400, headers });
  }
  if (rawDate !== null && !parsePublishedDate(rawDate)) {
    return NextResponse.json({ error: "Date must be a valid YYYY-MM-DD value." }, { status: 400, headers });
  }

  try {
    const result = await getPublishedPrayerTimes({ mosque: slug, date: rawDate });
    if (isPublishedLookupError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers });
    }

    return NextResponse.json(result, {
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Static prayer-times API failed", error);
    return NextResponse.json({ error: "Unable to load prayer times." }, { status: 500, headers });
  }
}
