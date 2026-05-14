import assert from "node:assert/strict";
import test from "node:test";

import { getDefaultHomeMosque } from "@/lib/home-prayer-widget-data";
import type { Mosque } from "@/types/prayer-times";

const sheffieldLocation = {
  citySlug: "sheffield",
  cityName: "Sheffield",
  countryCode: "GB",
  countryName: "United Kingdom",
  timezone: "Europe/London",
};

const mosques: Mosque[] = [
  {
    id: "al-huda",
    name: "Al-Huda Academy",
    address: "Sheffield",
    lat: 53.38,
    lng: -1.47,
    slug: "al-huda-academy",
    ...sheffieldLocation,
  },
  {
    id: "muslim-welfare-house",
    name: "Muslim Welfare House Sheffield",
    address: "Sheffield",
    lat: 53.39,
    lng: -1.48,
    slug: "muslim-welfare-house",
    ...sheffieldLocation,
  },
];

test("getDefaultHomeMosque chooses the configured home mosque when present", () => {
  assert.equal(getDefaultHomeMosque(mosques)?.slug, "muslim-welfare-house");
});

test("getDefaultHomeMosque falls back to the first mosque when the preferred mosque is unavailable", () => {
  assert.equal(getDefaultHomeMosque(mosques, "missing-mosque")?.slug, "al-huda-academy");
});

test("getDefaultHomeMosque returns null when no mosques are available", () => {
  assert.equal(getDefaultHomeMosque([]), null);
});
