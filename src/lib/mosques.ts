import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import mosquesData from "../../public/data/mosques.json";
import { HIDDEN_MOSQUE_SLUGS } from "@/lib/site";
import { Mosque } from "@/types/prayer-times";

const MOSQUES_CACHE_TTL_MS = 60_000;
const SHEFFIELD_CITY_SLUG = "sheffield";
const DEFAULT_SHEFFIELD_LOCATION = {
  citySlug: SHEFFIELD_CITY_SLUG,
  cityName: "Sheffield",
  countryCode: "GB",
  countryName: "United Kingdom",
  timezone: "Europe/London",
} as const;

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

let mosquesCache: TimedCacheEntry<Mosque[]> | null = null;
let mosquesInFlight: Promise<Mosque[]> | null = null;
const listMosquesQuery = makeFunctionReference<"query">("mosques:list");

function createTimedEntry<T>(value: T): TimedCacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + MOSQUES_CACHE_TTL_MS,
  };
}

type MosqueSource = Partial<Omit<Mosque, "lat" | "lng">> & {
  lat?: number | string;
  lng?: number | string;
};

function toNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMosque(record: MosqueSource): Mosque | null {
  const id = record.id?.trim() ?? "";
  const name = record.name?.trim() ?? "";
  const address = record.address?.trim() ?? "";
  const slug = record.slug?.trim() ?? "";
  const lat = toNumber(record.lat);
  const lng = toNumber(record.lng);

  if (!id || !name || !address || !slug || lat === null || lng === null) {
    return null;
  }

  const mosque: Mosque = {
    id,
    name,
    address,
    lat,
    lng,
    slug,
    citySlug: record.citySlug?.trim().toLowerCase() || DEFAULT_SHEFFIELD_LOCATION.citySlug,
    cityName: record.cityName?.trim() || DEFAULT_SHEFFIELD_LOCATION.cityName,
    countryCode: record.countryCode?.trim().toUpperCase() || DEFAULT_SHEFFIELD_LOCATION.countryCode,
    countryName: record.countryName?.trim() || DEFAULT_SHEFFIELD_LOCATION.countryName,
    timezone: record.timezone?.trim() || DEFAULT_SHEFFIELD_LOCATION.timezone,
  };
  if (record.website?.trim()) mosque.website = record.website.trim();
  if (record.isHidden !== undefined) mosque.isHidden = record.isHidden;

  return mosque;
}

function dedupeMosques(mosques: Mosque[]): Mosque[] {
  const bySlug = new Map<string, Mosque>();
  for (const mosque of mosques) {
    bySlug.set(mosque.slug, mosque);
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const STATIC_MOSQUES = dedupeMosques(
  (mosquesData.mosques ?? [])
    .map(normalizeMosque)
    .filter((mosque): mosque is Mosque => mosque !== null),
);

async function loadMosquesFromConvex(): Promise<Mosque[]> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) return [];

  try {
    const client = new ConvexHttpClient(convexUrl);
    const data = await client.query(listMosquesQuery, {});
    if (!Array.isArray(data)) return [];

    return dedupeMosques(
      data.map(normalizeMosque).filter((mosque): mosque is Mosque => mosque !== null),
    );
  } catch (error) {
    console.error("Failed to load mosques from Convex:", error);
    return [];
  }
}

async function loadAllMosques(): Promise<Mosque[]> {
  const convexMosques = await loadMosquesFromConvex();
  return dedupeMosques([...STATIC_MOSQUES, ...convexMosques]);
}

async function getAllMosquesCached(): Promise<Mosque[]> {
  if (mosquesCache && mosquesCache.expiresAt > Date.now()) {
    return mosquesCache.value;
  }

  if (mosquesInFlight) {
    return mosquesInFlight;
  }

  mosquesInFlight = (async () => {
    const mosques = await loadAllMosques();
    mosquesCache = createTimedEntry(mosques);
    return mosques;
  })();

  try {
    return await mosquesInFlight;
  } finally {
    mosquesInFlight = null;
  }
}

export async function getMosques({
  includeHidden = false,
}: {
  includeHidden?: boolean;
} = {}): Promise<Mosque[]> {
  const mosques = await getAllMosquesCached();
  if (includeHidden) return mosques;

  return mosques.filter(
    (mosque) => !mosque.isHidden && !HIDDEN_MOSQUE_SLUGS.has(mosque.slug),
  );
}

export async function getMosqueBySlug(
  slug: string,
  { includeHidden = false }: { includeHidden?: boolean } = {},
): Promise<Mosque | null> {
  const all = await getMosques({ includeHidden: true });
  const mosque = all.find((item) => item.slug === slug) ?? null;
  if (!mosque) return null;
  if (!includeHidden && (mosque.isHidden || HIDDEN_MOSQUE_SLUGS.has(mosque.slug))) {
    return null;
  }
  return mosque;
}
