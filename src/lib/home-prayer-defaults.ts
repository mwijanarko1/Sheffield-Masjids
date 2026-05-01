import type { Mosque } from "@/types/prayer-times";

export const DEFAULT_HOME_MOSQUE_SLUG = "muslim-welfare-house";

export function getDefaultHomeMosque(
  mosques: Mosque[],
  preferredSlug = DEFAULT_HOME_MOSQUE_SLUG,
): Mosque | null {
  if (mosques.length === 0) return null;
  return mosques.find((mosque) => mosque.slug === preferredSlug) ?? mosques[0];
}
