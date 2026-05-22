import path from "path";

/** @typedef {{ countryCode: string, citySlug: string }} MosqueLocation */

export const DEFAULT_SHEFFIELD = {
  countryCode: "gb",
  citySlug: "sheffield",
};

/**
 * Filesystem directory for a mosque's monthly / ramadan JSON.
 * @param {string} root - project root
 * @param {string} slug - mosque slug
 * @param {MosqueLocation} [location]
 */
export function mosqueDataFsDir(root, slug, location = DEFAULT_SHEFFIELD) {
  const country = location.countryCode.trim().toLowerCase();
  const city = location.citySlug.trim().toLowerCase();
  return path.join(root, "public", "data", "mosques", country, city, slug);
}
