import type { Mosque } from "@/types/prayer-times";

export function getMosqueCities(mosques: Mosque[]) {
  const cities = new Map<string, { href: string; name: string; countryName: string; mosques: Mosque[] }>();
  for (const mosque of mosques) {
    const href = `/cities/${mosque.countryCode.toLowerCase()}/${mosque.citySlug}`;
    const city = cities.get(href) ?? { href, name: mosque.cityName, countryName: mosque.countryName, mosques: [] };
    city.mosques.push(mosque);
    cities.set(href, city);
  }
  return Array.from(cities.values()).sort((a, b) => a.countryName.localeCompare(b.countryName) || a.name.localeCompare(b.name));
}
