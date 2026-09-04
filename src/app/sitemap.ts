import type { MetadataRoute } from "next";
import { getMosques } from "@/lib/mosques";
import { getBaseUrl } from "@/lib/site";
import { getMosqueCities } from "@/lib/mosque-cities";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const mosques = await getMosques();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/compare`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/timetable`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/masjidly`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/masjidly/terms`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/masjidly/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const mosqueRoutes: MetadataRoute.Sitemap = mosques.flatMap((mosque) => [
    {
      url: `${baseUrl}/mosques/${mosque.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mosques/${mosque.slug}/timetable`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mosques/${mosque.slug}/ramadan-timetable`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ]);

  const cityRoutes: MetadataRoute.Sitemap = getMosqueCities(mosques).map((city) => ({
    url: `${baseUrl}${city.href}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, { url: `${baseUrl}/mosques`, changeFrequency: "weekly", priority: 0.9 }, ...cityRoutes, ...mosqueRoutes];
}
