export const SITE_NAME = "Sheffield Masjids";
export const SITE_TITLE = `${SITE_NAME} | Prayer Timetables`;
export const SITE_DESCRIPTION =
  "Prayer times, iqamah times, and mosque locations across Sheffield.";

/** Mosque names for SEO keywords – people search "[mosque name] prayer times Sheffield" */
export const MOSQUE_NAMES = [
  "Muslim Welfare House Sheffield",
  "Masjid Risalah",
  "Sheffield Grand Mosque",
  "Masjid Sunnah Sheffield",
  "Masjid al Huda Sheffield",
  "Andalus Community Centre",
  "Madina Masjid Sheffield",
  "Al-Rahman Mosque",
  "Castle Asian Community Centre",
  "Dar Ul Uloom Siddiqia Masjid",
  "Jamia Masjid Ghausia",
  "Noor Al Hadi Mosque",
  "Al-Shafeey Centre",
  "Quba Mosque",
  "Masjid Umar Sheffield",
  "High Hazels Community Centre",
  "Al-Huda Academy",
  "Firth Park Cultural Centre",
] as const;

const DEFAULT_SITE_URL = "http://localhost:3000";

export const HIDDEN_MOSQUE_SLUGS = new Set<string>();

export function getBaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!rawUrl) {
    return DEFAULT_SITE_URL;
  }

  const normalized = rawUrl.replace(/\/+$/, "");

  try {
    return new URL(normalized).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
