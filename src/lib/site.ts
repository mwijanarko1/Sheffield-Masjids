export const SITE_NAME = "Sheffield Masjids";
export const SITE_TITLE = `${SITE_NAME} | Prayer Timetables`;
export const SITE_DESCRIPTION =
  "Prayer times, iqamah times, and mosque locations across Sheffield.";

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
