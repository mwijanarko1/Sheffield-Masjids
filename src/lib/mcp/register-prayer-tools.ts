import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  getPrayerTimes,
  isMcpToolError,
  searchMosques,
} from "@/lib/mcp/prayer-tools";

const mosqueSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.string(),
  address: z.string(),
  url: z.string(),
});

const searchOutputSchema = z.object({
  count: z.number().int(),
  mosques: z.array(mosqueSummarySchema),
});

const prayerTimesOutputSchema = z.object({
  mosque: mosqueSummarySchema,
  date: z.string(),
  timezone: z.string(),
  adhan: z.object({
    fajr: z.string(),
    sunrise: z.string(),
    dhuhr: z.string(),
    asr: z.string(),
    maghrib: z.string(),
    isha: z.string(),
  }),
  iqamah: z.object({
    fajr: z.string(),
    dhuhr: z.string(),
    asr: z.string(),
    maghrib: z.string(),
    isha: z.string(),
    jummah: z.string().nullable(),
  }).nullable(),
});

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

function toolResult(
  data:
    | { count: number; mosques: Array<{
        slug: string;
        name: string;
        city: string;
        country: string;
        address: string;
        url: string;
      }> }
    | {
        mosque: {
          slug: string;
          name: string;
          city: string;
          country: string;
          address: string;
          url: string;
        };
        date: string;
        timezone: string;
        adhan: {
          fajr: string;
          sunrise: string;
          dhuhr: string;
          asr: string;
          maghrib: string;
          isha: string;
        };
        iqamah: {
          fajr: string;
          dhuhr: string;
          asr: string;
          maghrib: string;
          isha: string;
          jummah: string | null;
        } | null;
      },
) {
  return {
    structuredContent: data,
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function registerPrayerTools(server: McpServer): void {
  server.registerTool(
    "search_mosques",
    {
      title: "Search mosques",
      description:
        "Use this when the user wants to find a mosque in the Sheffield Masjids directory by name, city, or country. Returns matching mosques with slug, address, and page URL. Do not use for prayer times; call get_prayer_times after resolving a slug.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe("Mosque name, city, or country search text."),
        city: z
          .string()
          .optional()
          .describe("Optional city name or city slug filter, for example sheffield."),
        country: z
          .string()
          .optional()
          .describe("Optional country name or ISO country code filter, for example GB."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum matches to return. Defaults to 20."),
      }),
      outputSchema: searchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ query, city, country, limit }) => {
      const result = await searchMosques({ query, city, country, limit });
      if (isMcpToolError(result)) return toolError(result.error);
      return toolResult(result);
    },
  );

  server.registerTool(
    "get_prayer_times",
    {
      title: "Get prayer times",
      description:
        "Use this when the user asks for adhan or iqamah prayer times for a mosque on a given date. Prefer a mosque slug from search_mosques. Date is optional and defaults to today in Europe/London. Always label adhan and iqamah separately. iqamah is null when the mosque publishes adhan times only for that day; say iqamah is not published rather than estimating it. Do not invent times or present one mosque's iqamah as a city-wide time.",
      inputSchema: z.object({
        mosque: z
          .string()
          .min(1)
          .describe("Mosque slug or exact name, for example madina-masjid-sheffield."),
        date: z
          .string()
          .optional()
          .describe("Optional date in YYYY-MM-DD. Defaults to today in Europe/London."),
      }),
      outputSchema: prayerTimesOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ mosque, date }) => {
      const result = await getPrayerTimes({ mosque, date });
      if (isMcpToolError(result)) return toolError(result.error);
      return toolResult(result);
    },
  );
}
