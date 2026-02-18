import type { MetadataRoute } from "next";
import { getMosques } from "@/lib/mosques";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();
  const mosques = await getMosques();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const mosqueRoutes: MetadataRoute.Sitemap = mosques.map((mosque) => ({
      url: `${baseUrl}/mosques/${mosque.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...mosqueRoutes];
}
