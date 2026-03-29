import { getBaseUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * JSON-LD WebSite schema for the homepage.
 * Reinforces entity + topic (Sheffield, prayer times) for discovery.
 */
export default function WebsiteJsonLd() {
  const baseUrl = getBaseUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: SITE_NAME,
    alternateName: [
      "Sheffield Prayer Times",
      "Sheffield mosque prayer times",
      "Sheffield masjid timetables",
    ],
    url: baseUrl,
    inLanguage: "en-GB",
    description: SITE_DESCRIPTION,
    about: {
      "@type": "City",
      name: "Sheffield",
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "South Yorkshire",
        containedInPlace: {
          "@type": "Country",
          name: "United Kingdom",
        },
      },
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
