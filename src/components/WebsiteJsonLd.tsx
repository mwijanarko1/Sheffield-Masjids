import { getBaseUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * JSON-LD WebSite schema for the homepage.
 * Reinforces entity + topic (Sheffield, prayer times) for discovery.
 */
export default function WebsiteJsonLd() {
  const baseUrl = getBaseUrl();

  const organizationId = `${baseUrl}/#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
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
        publisher: { "@id": organizationId },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: baseUrl,
        logo: `${baseUrl}/opengraph-image`,
        email: "mikhailspeaks@gmail.com",
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "support",
          email: "mikhailspeaks@gmail.com",
          availableLanguage: "English",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Sheffield",
          addressRegion: "South Yorkshire",
          addressCountry: "GB",
        },
        areaServed: {
          "@type": "City",
          name: "Sheffield",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
