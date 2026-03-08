import { getBaseUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * JSON-LD WebSite schema for the homepage.
 * Helps search engines understand the site and enables sitelinks search box.
 */
export default function WebsiteJsonLd() {
  const baseUrl = getBaseUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: baseUrl,
    description: SITE_DESCRIPTION,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
