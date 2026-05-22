import path from "path";
import mosquesData from "../../public/data/mosques.json";

export type MosqueLocation = {
  countryCode: string;
  citySlug: string;
};

const DEFAULT_LOCATION: MosqueLocation = {
  countryCode: "GB",
  citySlug: "sheffield",
};

const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCATION_SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeCountryCode(countryCode: string): string {
  const normalized = countryCode.trim().toLowerCase();
  if (!LOCATION_SEGMENT_RE.test(normalized)) {
    throw new Error(`Invalid countryCode: "${countryCode.slice(0, 32)}"`);
  }
  return normalized;
}

function normalizeCitySlug(citySlug: string): string {
  const normalized = citySlug.trim().toLowerCase();
  if (!LOCATION_SEGMENT_RE.test(normalized)) {
    throw new Error(`Invalid citySlug: "${citySlug.slice(0, 32)}"`);
  }
  return normalized;
}

export function normalizeMosqueSlugForPath(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 64 || !MOSQUE_SLUG_RE.test(normalized)) {
    throw new Error(`Invalid mosque slug: "${slug.slice(0, 80)}"`);
  }
  return normalized;
}

/** Public URL path segment for static mosque JSON (no trailing slash). */
export function getMosqueDataPublicBasePath(
  location: MosqueLocation,
  slug: string,
): string {
  const country = normalizeCountryCode(location.countryCode);
  const city = normalizeCitySlug(location.citySlug);
  const safeSlug = normalizeMosqueSlugForPath(slug);
  return `/data/mosques/${country}/${city}/${safeSlug}`;
}

export function getMosqueMonthlyJsonUrl(
  location: MosqueLocation,
  slug: string,
  monthFile: string,
): string {
  return `${getMosqueDataPublicBasePath(location, slug)}/${monthFile}.json`;
}

export function getMosqueRamadanJsonUrl(location: MosqueLocation, slug: string): string {
  return `${getMosqueDataPublicBasePath(location, slug)}/ramadan.json`;
}

/** Absolute filesystem directory for mosque JSON (Node scripts / seed). */
export function getMosqueDataFsDir(
  projectRoot: string,
  slug: string,
  location?: MosqueLocation,
): string {
  const resolved = location ?? resolveMosqueLocationForSlug(slug);
  const country = normalizeCountryCode(resolved.countryCode);
  const city = normalizeCitySlug(resolved.citySlug);
  const safeSlug = normalizeMosqueSlugForPath(slug);
  return path.join(projectRoot, "public", "data", "mosques", country, city, safeSlug);
}

/** Resolve country/city for a slug from the static registry (defaults to Sheffield). */
export function resolveMosqueLocationForSlug(slug: string): MosqueLocation {
  const safeSlug = normalizeMosqueSlugForPath(slug);
  const mosques = (mosquesData as { mosques?: Array<Record<string, unknown>> }).mosques ?? [];

  for (const record of mosques) {
    if (typeof record.slug !== "string" || record.slug.trim().toLowerCase() !== safeSlug) {
      continue;
    }
    const citySlug =
      typeof record.citySlug === "string" && record.citySlug.trim()
        ? record.citySlug
        : DEFAULT_LOCATION.citySlug;
    const countryCode =
      typeof record.countryCode === "string" && record.countryCode.trim()
        ? record.countryCode
        : DEFAULT_LOCATION.countryCode;
    return { countryCode, citySlug };
  }

  return DEFAULT_LOCATION;
}
