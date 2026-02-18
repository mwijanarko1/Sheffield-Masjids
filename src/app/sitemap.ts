import type { MetadataRoute } from "next";
import mosquesData from "../../public/data/mosques.json";
import { Mosque } from "@/types/prayer-times";
import { getBaseUrl, HIDDEN_MOSQUE_SLUGS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

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

  const mosqueRoutes: MetadataRoute.Sitemap = (mosquesData.mosques as Mosque[])
    .filter((mosque) => !HIDDEN_MOSQUE_SLUGS.has(mosque.slug))
    .map((mosque) => ({
      url: `${baseUrl}/mosques/${mosque.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...mosqueRoutes];
}

