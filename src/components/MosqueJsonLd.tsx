import type { Mosque } from "@/types/prayer-times";
import { getBaseUrl } from "@/lib/site";

interface MosqueJsonLdProps {
  mosque: Mosque;
}

/**
 * JSON-LD LocalBusiness schema for mosque pages.
 * Helps search engines understand the entity and show rich results for "[mosque name] prayer times" searches.
 */
export default function MosqueJsonLd({ mosque }: MosqueJsonLdProps) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/mosques/${mosque.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PlaceOfWorship",
    "@id": url,
    name: mosque.name,
    description: `Prayer times and iqamah times for ${mosque.name} in Sheffield. Daily timetables, monthly schedules, and Ramadan times.`,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: mosque.address,
      addressLocality: "Sheffield",
      addressCountry: "GB",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: mosque.lat,
      longitude: mosque.lng,
    },
    ...(mosque.website && { sameAs: mosque.website }),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
      description: "Open for five daily prayers. See timetable for exact prayer and iqamah times.",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
