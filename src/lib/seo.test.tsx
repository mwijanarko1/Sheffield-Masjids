import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MosqueJsonLd from "@/components/MosqueJsonLd";
import { getBaseUrl } from "@/lib/site";
import { getMosqueCities } from "@/lib/mosque-cities";
import type { Mosque } from "@/types/prayer-times";

const mosque: Mosque = {
  id: "didsbury-mosque",
  slug: "didsbury-mosque",
  name: "Didsbury Mosque",
  address: "271 Burton Rd, Manchester M20 2WA, United Kingdom",
  citySlug: "manchester",
  cityName: "Manchester",
  countryCode: "GB",
  countryName: "United Kingdom",
  timezone: "Europe/London",
  lat: 53.4172,
  lng: -2.2316,
};

test("canonical URLs default to the public domain without deployment configuration", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    for (const value of ["", "not-a-url"]) {
      process.env.NEXT_PUBLIC_SITE_URL = value;
      assert.equal(getBaseUrl(), "https://www.sheffieldmasjids.com");
    }
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.sheffieldmasjids.com/";
    assert.equal(getBaseUrl(), "https://www.sheffieldmasjids.com");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test("mosque structured data uses its real city without inventing opening hours", () => {
  const html = renderToStaticMarkup(<MosqueJsonLd mosque={mosque} />);
  const data = JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, ""));
  assert.equal(data.address.addressLocality, "Manchester");
  assert.equal(data.address.addressCountry, "GB");
  assert.match(data.description, /Manchester/);
  assert.equal(data.openingHoursSpecification, undefined);
});

test("city directory groups mosques without merging cities across countries", () => {
  const cities = getMosqueCities([
    mosque,
    { ...mosque, id: "second", slug: "second" },
    { ...mosque, countryCode: "US", countryName: "United States" },
  ]);
  assert.equal(cities.length, 2);
  assert.equal(cities[0].href, "/cities/gb/manchester");
  assert.equal(cities[0].mosques.length, 2);
  assert.equal(cities[1].href, "/cities/us/manchester");
  assert.deepEqual(getMosqueCities([]), []);
});

test("mosque structured data cannot terminate its script element", () => {
  const html = renderToStaticMarkup(<MosqueJsonLd mosque={{ ...mosque, name: "</script><script>alert(1)</script>" }} />);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
});
