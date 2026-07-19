import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_LOCATION_FIELDS = [
  "citySlug",
  "cityName",
  "countryCode",
  "countryName",
] as const;

type MosqueRecord = {
  id?: string;
  slug?: string;
  name?: string;
  isHidden?: boolean;
  citySlug?: string;
  cityName?: string;
  countryCode?: string;
  countryName?: string;
};

test("every non-hidden mosque has non-empty location fields", () => {
  const file = join(process.cwd(), "public", "data", "mosques.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as { mosques: MosqueRecord[] };

  const incomplete = data.mosques
    .filter((mosque) => !mosque.isHidden)
    .filter((mosque) =>
      REQUIRED_LOCATION_FIELDS.some((field) => {
        const value = mosque[field];
        return typeof value !== "string" || value.trim() === "";
      }),
    )
    .map((mosque) => mosque.id ?? mosque.slug ?? mosque.name ?? "unknown");

  assert.deepEqual(incomplete, []);
});
