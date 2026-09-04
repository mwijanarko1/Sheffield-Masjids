export const SITE_NAME = "Sheffield Masjids";

/** Masjidly store links (website CTAs; keep in sync with public/masjidly/latest.json). */
export const MASJIDLY_APP_STORE_URL =
  "https://apps.apple.com/gb/app/masjidly-masjid-prayer-times/id6767841833";
export const MASJIDLY_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.mikhailspeaks.masjidly&hl=en";
/** Default document title: lead with the main search phrase people use. */
export const SITE_TITLE = `UK Mosque Prayer Times | Adhan & Iqamah | ${SITE_NAME}`;
export const SITE_DESCRIPTION =
  "Prayer times and iqamah for mosques in Sheffield, across the UK and beyond. Find mosque-specific daily adhan times, monthly timetables, Ramadan schedules and addresses.";

/** Mosque names for SEO keywords: people search "[mosque name] prayer times Sheffield" */
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
  "Masjid Quba Education Centre",
  "Masjid Umar Sheffield",
  "High Hazels Community Centre",
  "Al-Huda Academy",
  "Firth Park Cultural Centre",
  "Sheffield Ummah Center",
] as const;

const DEFAULT_SITE_URL = "https://www.sheffieldmasjids.com";

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
