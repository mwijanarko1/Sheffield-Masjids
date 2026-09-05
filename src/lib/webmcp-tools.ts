import {
  getDateInSheffield,
  getIqamahTimesForSpecificDateWithDstMapping,
  getPrayerTimesForDate,
} from "@/lib/prayer-times";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";
const SELECTED_CITY_STORAGE_KEY = "selected-city-slug";
const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type MosqueRecord = {
  id: string;
  name: string;
  slug: string;
  address: string;
  citySlug: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  timezone?: string;
  website?: string;
  isHidden?: boolean;
};

type MosquesPayload = {
  mosques?: MosqueRecord[];
};

let mosquesCache: MosqueRecord[] | null = null;
let mosquesInFlight: Promise<MosqueRecord[]> | null = null;

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function normalizeSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  if (!MOSQUE_SLUG_RE.test(slug)) return null;
  return slug;
}

function parseDateInput(value: string | null): Date | null {
  if (!value) {
    const { year, month, day } = getDateInSheffield(new Date());
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }
  if (!DATE_RE.test(value)) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function formatDateKey(date: Date): string {
  const { year, month, day } = getDateInSheffield(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function loadPublicMosques(): Promise<MosqueRecord[]> {
  if (mosquesCache) return mosquesCache;
  if (mosquesInFlight) return mosquesInFlight;

  mosquesInFlight = (async () => {
    const response = await fetch("/data/mosques.json", { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load mosque directory (${response.status})`);
    }
    const payload = (await response.json()) as MosquesPayload;
    const mosques = (payload.mosques ?? []).filter((mosque) => !mosque.isHidden);
    mosquesCache = mosques;
    return mosques;
  })();

  try {
    return await mosquesInFlight;
  } finally {
    mosquesInFlight = null;
  }
}

function findMosque(
  mosques: MosqueRecord[],
  slugOrName: string,
): MosqueRecord | null {
  const needle = slugOrName.trim().toLowerCase();
  if (!needle) return null;

  const bySlug = mosques.find((mosque) => mosque.slug === needle || mosque.id === needle);
  if (bySlug) return bySlug;

  const exactName = mosques.find((mosque) => mosque.name.toLowerCase() === needle);
  if (exactName) return exactName;

  const partial = mosques.filter((mosque) => mosque.name.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}

function summarizeMosque(mosque: MosqueRecord) {
  return {
    slug: mosque.slug,
    name: mosque.name,
    city: mosque.cityName,
    country: mosque.countryName,
    address: mosque.address,
    url: `/mosques/${mosque.slug}`,
  };
}

export const webMcpToolDefinitions: WebMcpToolDefinition[] = [
  {
    name: "search_mosques",
    description:
      "Search the Sheffield Masjids directory by mosque name, city, or country. Returns matching mosques with slug, address, and page URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Mosque name, city, or country search text.",
        },
        city: {
          type: "string",
          description: "Optional city name or city slug filter, for example sheffield.",
        },
        country: {
          type: "string",
          description: "Optional country name or ISO country code filter, for example GB.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Maximum matches to return. Defaults to 20.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args) => {
      const query = asString(args.query);
      if (!query) return "ERROR: query is required.";

      const city = asString(args.city)?.toLowerCase() ?? null;
      const country = asString(args.country)?.toLowerCase() ?? null;
      const limitRaw = typeof args.limit === "number" ? args.limit : 20;
      const limit = Math.min(50, Math.max(1, Math.floor(limitRaw) || 20));
      const needle = query.toLowerCase();

      const mosques = await loadPublicMosques();
      const matches = mosques
        .filter((mosque) => {
          if (city && mosque.citySlug !== city && mosque.cityName.toLowerCase() !== city) {
            return false;
          }
          if (
            country &&
            mosque.countryCode.toLowerCase() !== country &&
            mosque.countryName.toLowerCase() !== country
          ) {
            return false;
          }
          return (
            mosque.name.toLowerCase().includes(needle) ||
            mosque.slug.includes(needle) ||
            mosque.cityName.toLowerCase().includes(needle) ||
            mosque.countryName.toLowerCase().includes(needle) ||
            mosque.address.toLowerCase().includes(needle)
          );
        })
        .slice(0, limit)
        .map(summarizeMosque);

      return JSON.stringify({
        count: matches.length,
        mosques: matches,
      });
    },
  },
  {
    name: "get_prayer_times",
    description:
      "Get adhan and iqamah prayer times for a mosque on a given date (Europe/London calendar day). Use mosque slug from search_mosques when possible.",
    inputSchema: {
      type: "object",
      properties: {
        mosque: {
          type: "string",
          description: "Mosque slug or exact name, for example madina-masjid-sheffield.",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD. Defaults to today in Europe/London.",
        },
      },
      required: ["mosque"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args) => {
      const mosqueInput = asString(args.mosque);
      if (!mosqueInput) return "ERROR: mosque is required.";

      const dateInput = asString(args.date);
      const date = parseDateInput(dateInput);
      if (!date) return "ERROR: date must be YYYY-MM-DD.";

      const mosques = await loadPublicMosques();
      const mosque = findMosque(mosques, mosqueInput);
      if (!mosque) {
        return `ERROR: mosque not found for "${mosqueInput}". Use search_mosques first.`;
      }

      const [adhan, iqamah] = await Promise.all([
        getPrayerTimesForDate(mosque.slug, date),
        getIqamahTimesForSpecificDateWithDstMapping(mosque.slug, date),
      ]);

      return JSON.stringify({
        mosque: summarizeMosque(mosque),
        date: formatDateKey(date),
        timezone: mosque.timezone || "Europe/London",
        adhan: {
          fajr: adhan.fajr,
          sunrise: adhan.sunrise,
          dhuhr: adhan.dhuhr,
          asr: adhan.asr,
          maghrib: adhan.maghrib,
          isha: adhan.isha,
        },
        iqamah: {
          fajr: iqamah.fajr,
          dhuhr: iqamah.dhuhr,
          asr: iqamah.asr,
          maghrib: iqamah.maghrib,
          isha: iqamah.isha,
          jummah: iqamah.jummah || null,
        },
      });
    },
  },
  {
    name: "open_mosque",
    description:
      "Open a mosque detail page on this site. Prefer mosque slug from search_mosques.",
    inputSchema: {
      type: "object",
      properties: {
        mosque: {
          type: "string",
          description: "Mosque slug or exact name.",
        },
      },
      required: ["mosque"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (args) => {
      const mosqueInput = asString(args.mosque);
      if (!mosqueInput) return "ERROR: mosque is required.";

      const mosques = await loadPublicMosques();
      const mosque = findMosque(mosques, mosqueInput);
      if (!mosque) {
        return `ERROR: mosque not found for "${mosqueInput}". Use search_mosques first.`;
      }

      window.location.assign(`/mosques/${mosque.slug}`);
      return `Opening ${mosque.name} at /mosques/${mosque.slug}`;
    },
  },
  {
    name: "select_mosque",
    description:
      "Set the user's preferred mosque for the home prayer widget, then open the home page.",
    inputSchema: {
      type: "object",
      properties: {
        mosque: {
          type: "string",
          description: "Mosque slug or exact name to select.",
        },
      },
      required: ["mosque"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (args) => {
      const mosqueInput = asString(args.mosque);
      if (!mosqueInput) return "ERROR: mosque is required.";

      const mosques = await loadPublicMosques();
      const mosque = findMosque(mosques, mosqueInput);
      if (!mosque) {
        return `ERROR: mosque not found for "${mosqueInput}". Use search_mosques first.`;
      }

      const slug = normalizeSlug(mosque.slug);
      if (!slug) return "ERROR: invalid mosque slug.";

      try {
        window.localStorage.setItem(SELECTED_MOSQUE_STORAGE_KEY, mosque.id);
        window.localStorage.setItem(SELECTED_CITY_STORAGE_KEY, mosque.citySlug);
      } catch {
        // localStorage may be blocked; still navigate home.
      }

      window.location.assign("/");
      return `Selected ${mosque.name} and opening the home page.`;
    },
  },
];

export async function registerWebMcpTools(
  tools: WebMcpToolDefinition[] = webMcpToolDefinitions,
): Promise<() => void> {
  const modelContext = document.modelContext;
  if (!modelContext) {
    return () => undefined;
  }

  const controller = new AbortController();
  await Promise.all(
    tools.map((tool) =>
      modelContext.registerTool(tool, { signal: controller.signal }),
    ),
  );

  return () => {
    controller.abort();
  };
}
