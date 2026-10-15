import {
  findPublishedMosque,
  getPublishedPrayerTimes,
  isPublishedLookupError,
  listPublishedMosques,
  type PublishedMosqueSummary,
  type PublishedPrayerTimes,
} from "@/lib/published-prayer-times";
import { getBaseUrl } from "@/lib/site";

export type McpMosqueSummary = PublishedMosqueSummary;
export type McpPrayerTimesResult = Omit<PublishedPrayerTimes, "source">;
export type McpToolError = { error: string };

function summarizeListedMosque(mosque: {
  slug: string;
  name: string;
  address: string;
  cityName?: string;
  countryName?: string;
}): McpMosqueSummary {
  return {
    slug: mosque.slug,
    name: mosque.name,
    city: mosque.cityName || "Sheffield",
    country: mosque.countryName || "United Kingdom",
    address: mosque.address,
    url: `${getBaseUrl()}/mosques/${mosque.slug}`,
  };
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

  const matches = listPublishedMosques()
    .filter((mosque) => {
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
    .map(summarizeListedMosque);

  return { count: matches.length, mosques: matches };
}

export async function getPrayerTimes(args: {
  mosque: string;
  date?: string;
}): Promise<McpPrayerTimesResult | McpToolError> {
  const mosqueInput = args.mosque.trim();
  if (!mosqueInput) return { error: "mosque is required." };

  // Prefer resolving the mosque first so search guidance stays clear.
  if (!findPublishedMosque(mosqueInput)) {
    return {
      error: `mosque not found for "${mosqueInput}". Use search_mosques first.`,
    };
  }

  const result = await getPublishedPrayerTimes({
    mosque: mosqueInput,
    date: args.date,
  });

  if (isPublishedLookupError(result)) {
    return { error: result.error };
  }

  const { source: _source, ...payload } = result;
  return payload;
}

export function isMcpToolError(
  value:
    | McpToolError
    | { count: number; mosques: McpMosqueSummary[] }
    | McpPrayerTimesResult,
): value is McpToolError {
  return "error" in value;
}
