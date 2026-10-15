import mosquesData from "../../../public/data/mosques.json";
import {
  getDateInSheffield,
  getIqamahTimesForSpecificDateWithDstMapping,
  getPrayerTimesForDate,
} from "@/lib/prayer-times";
import { getBaseUrl } from "@/lib/site";

const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type MosqueRecord = {
  id: string;
  name: string;
  slug: string;
  address: string;
  citySlug?: string;
  cityName?: string;
  countryCode?: string;
  countryName?: string;
  timezone?: string;
  isHidden?: boolean;
};

export type McpMosqueSummary = {
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string;
  url: string;
};

export type McpPrayerTimesResult = {
  mosque: McpMosqueSummary;
  date: string;
  timezone: string;
  adhan: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  iqamah: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string | null;
  };
};

export type McpToolError = {
  error: string;
};

const PUBLIC_MOSQUES: MosqueRecord[] = (mosquesData.mosques ?? []).filter(
  (mosque) => !mosque.isHidden,
);

function summarizeMosque(mosque: MosqueRecord): McpMosqueSummary {
  return {
    slug: mosque.slug,
    name: mosque.name,
    city: mosque.cityName || "Sheffield",
    country: mosque.countryName || "United Kingdom",
    address: mosque.address,
    url: `${getBaseUrl()}/mosques/${mosque.slug}`,
  };
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value) {
    const { year, month, day } = getDateInSheffield(new Date());
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }
  if (!DATE_RE.test(value)) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatDateKey(date: Date): string {
  const { year, month, day } = getDateInSheffield(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findMosque(slugOrName: string): MosqueRecord | null {
  const needle = slugOrName.trim().toLowerCase();
  if (!needle) return null;

  if (MOSQUE_SLUG_RE.test(needle)) {
    const bySlug = PUBLIC_MOSQUES.find(
      (mosque) => mosque.slug === needle || mosque.id === needle,
    );
    if (bySlug) return bySlug;
  }

  const exactName = PUBLIC_MOSQUES.find((mosque) => mosque.name.toLowerCase() === needle);
  if (exactName) return exactName;

  const partial = PUBLIC_MOSQUES.filter((mosque) => mosque.name.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}

export async function searchMosques(args: {
  query: string;
  city?: string;
  country?: string;
  limit?: number;
}): Promise<{ count: number; mosques: McpMosqueSummary[] } | McpToolError> {
  const query = args.query.trim();
  if (!query) return { error: "query is required." };

  const city = args.city?.trim().toLowerCase() || null;
  const country = args.country?.trim().toLowerCase() || null;
  const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 20) || 20));
  const needle = query.toLowerCase();

  const matches = PUBLIC_MOSQUES.filter((mosque) => {
    const citySlug = (mosque.citySlug || "sheffield").toLowerCase();
    const cityName = (mosque.cityName || "Sheffield").toLowerCase();
    const countryCode = (mosque.countryCode || "GB").toLowerCase();
    const countryName = (mosque.countryName || "United Kingdom").toLowerCase();

    if (city && citySlug !== city && cityName !== city) return false;
    if (country && countryCode !== country && countryName !== country) return false;

    return (
      mosque.name.toLowerCase().includes(needle) ||
      mosque.slug.includes(needle) ||
      cityName.includes(needle) ||
      countryName.includes(needle) ||
      mosque.address.toLowerCase().includes(needle)
    );
  })
    .slice(0, limit)
    .map(summarizeMosque);

  return { count: matches.length, mosques: matches };
}

export async function getPrayerTimes(args: {
  mosque: string;
  date?: string;
}): Promise<McpPrayerTimesResult | McpToolError> {
  const mosqueInput = args.mosque.trim();
  if (!mosqueInput) return { error: "mosque is required." };

  const date = parseDateInput(args.date?.trim());
  if (!date) return { error: "date must be YYYY-MM-DD." };

  const mosque = findMosque(mosqueInput);
  if (!mosque) {
    return {
      error: `mosque not found for "${mosqueInput}". Use search_mosques first.`,
    };
  }

  try {
    const [adhan, iqamah] = await Promise.all([
      getPrayerTimesForDate(mosque.slug, date),
      getIqamahTimesForSpecificDateWithDstMapping(mosque.slug, date),
    ]);

    return {
      mosque: summarizeMosque(mosque),
      date: formatDateKey(date),
      timezone: mosque.timezone || "Europe/London",
      adhan: {
        fajr: adhan.fajr,
        sunrise: adhan.sunrise,
        dhuhr: adhan.dhuhr,
        asr: adhan.asr,
        maghrib: adhan.maghrib,
        isha: adhan.isha,
      },
      iqamah: {
        fajr: iqamah.fajr,
        dhuhr: iqamah.dhuhr,
        asr: iqamah.asr,
        maghrib: iqamah.maghrib,
        isha: iqamah.isha,
        jummah: iqamah.jummah?.trim() || null,
      },
    };
  } catch {
    return {
      error: `Prayer times are not available for ${mosque.slug} on ${formatDateKey(date)}.`,
    };
  }
}

export function isMcpToolError(
  value: McpToolError | { count: number; mosques: McpMosqueSummary[] } | McpPrayerTimesResult,
): value is McpToolError {
  return "error" in value;
}
