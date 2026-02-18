import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import mosquesData from "../../public/data/mosques.json";
import { HIDDEN_MOSQUE_SLUGS } from "@/lib/site";
import { Mosque } from "@/types/prayer-times";

const MOSQUES_CACHE_TTL_MS = 60_000;

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

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeMosque(value: unknown): Mosque | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const address = typeof record.address === "string" ? record.address.trim() : "";
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  const lat = toNumber(record.lat);
  const lng = toNumber(record.lng);

  if (!id || !name || !address || !slug || lat === null || lng === null) {
    return null;
  }

  const mosque: Mosque = { id, name, address, lat, lng, slug };
  if (typeof record.website === "string" && record.website.trim()) {
    mosque.website = record.website.trim();
  }
  if (typeof record.isHidden === "boolean") {
    mosque.isHidden = record.isHidden;
  }

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
  ((mosquesData as { mosques?: unknown[] }).mosques ?? [])
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
