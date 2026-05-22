import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getMosqueDataPublicBasePath,
  getMosqueMonthlyJsonUrl,
  resolveMosqueLocationForSlug,
} from "./mosque-data-path";

test("getMosqueDataPublicBasePath uses country and city segments", () => {
  assert.equal(
    getMosqueDataPublicBasePath({ countryCode: "GB", citySlug: "sheffield" }, "al-huda-academy"),
    "/data/mosques/gb/sheffield/al-huda-academy",
  );
});

test("getMosqueMonthlyJsonUrl appends month file", () => {
  assert.equal(
    getMosqueMonthlyJsonUrl({ countryCode: "gb", citySlug: "leeds" }, "leeds-grand-mosque", "january"),
    "/data/mosques/gb/leeds/leeds-grand-mosque/january.json",
  );
});

test("resolveMosqueLocationForSlug returns Leeds for leeds-grand-mosque", () => {
  assert.deepEqual(resolveMosqueLocationForSlug("leeds-grand-mosque"), {
    countryCode: "GB",
    citySlug: "leeds",
  });
});

test("resolveMosqueLocationForSlug defaults unknown slugs to Sheffield", () => {
  assert.deepEqual(resolveMosqueLocationForSlug("muslim-welfare-house"), {
    countryCode: "GB",
    citySlug: "sheffield",
  });
});
