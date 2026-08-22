import { NextRequest, NextResponse } from "next/server";
import { buildMonthlyCalendarEvents } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import { buildIcsCalendar } from "@/features/calendar-export/lib/ics";
import type { CalendarExportMode } from "@/features/calendar-export/types";
import { getMosqueBySlug } from "@/lib/mosques";
import { getDateInSheffield, loadMonthlyPrayerTimes } from "@/lib/prayer-times";

const VALID_RANGE = new Set(["year", "month"]);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function parseYear(value: string | null): number {
  const currentYear = getDateInSheffield(new Date()).year;
  if (!value) return currentYear;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year. Use a four-digit year between 2000 and 2100.");
  }
  return year;
}

function parseMonth(value: string | null): number {
  if (!value) return getDateInSheffield(new Date()).month;
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month. Use a number from 1 to 12.");
  }
  return month;
}

function parseMode(value: string | null): CalendarExportMode {
  const mode = (value ?? "iqamah").toLowerCase();
  if (mode === "adhan" || mode === "iqamah" || mode === "both") {
    return mode;
  }
  throw new Error("Invalid mode. Use adhan, iqamah, or both.");
}

function contentDispositionFilename(slug: string, year: number, range: string, mode: CalendarExportMode): string {
  return `${slug}-${year}-${range}-${mode}-calendar-feed.ics`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const mosqueSlug = searchParams.get("mosque")?.trim().toLowerCase();

  if (!mosqueSlug) {
    return jsonError("Missing mosque query parameter.", 400);
  }

  try {
    const [year, mode] = [parseYear(searchParams.get("year")), parseMode(searchParams.get("mode"))];
    const range = (searchParams.get("range") ?? "year").toLowerCase();
    if (!VALID_RANGE.has(range)) {
      return jsonError("Invalid range. Use year or month.", 400);
    }

    const month = parseMonth(searchParams.get("month"));
    const monthsToExport = range === "year" ? Array.from({ length: 12 }, (_, index) => index + 1) : [month];
    const mosque = await getMosqueBySlug(mosqueSlug, { includeHidden: false });

    if (!mosque) {
      return jsonError("Mosque not found.", 404);
    }

    const monthlyPayloads = await Promise.all(
      monthsToExport.map(async (monthValue) => {
        const monthlyData = await loadMonthlyPrayerTimes(mosque.slug, monthValue, year);
        return buildMonthlyCalendarEvents({
          mosque,
          month: monthValue,
          year,
          monthLabel: MONTH_NAMES[monthValue - 1],
          monthlyData,
          mode,
        });
      }),
    );

    const events = monthlyPayloads.flat();
    if (events.length === 0) {
      return jsonError("No exportable prayer times were available.", 404);
    }

    const calendarName = `${mosque.name} Prayer Times${range === "month" ? ` - ${MONTH_NAMES[month - 1]} ${year}` : ` ${year}`}`;
    const contents = buildIcsCalendar(events, new Date(), { calendarName });
    return new NextResponse(contents, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Disposition": `inline; filename="${contentDispositionFilename(mosque.slug, year, range, mode)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate calendar feed.";
    return jsonError(message, 400);
  }
}
