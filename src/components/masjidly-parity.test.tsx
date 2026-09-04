import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MasjidlyHomeHero from "./MasjidlyHomeHero";
import PrayerSunPhaseIcon from "./PrayerSunPhaseIcon";
import { usePersistedMosque } from "../hooks/use-persisted-mosque";
import type { Mosque } from "../types/prayer-times";
import { MASJIDLY_MODERN_SKIES, textColorForTheme } from "../lib/masjidly-theme";

const props: React.ComponentProps<typeof MasjidlyHomeHero> = {
  fg: "#FFFFFF", fgMuted: "#CCCCCC", skyTheme: "fajr",
  gregorianDate: "4 September 2026", hijriDate: "22 Rabi I 1448",
  onPrevDay: () => {}, onNextDay: () => {},
  prayers: [{ id: "fajr", label: "Fajr", letter: "F", adhan: "05:02", iqamah: "05:30", theme: "fajr" }],
  selectedIndex: 0, onSelectPrayer: () => {}, showCountdown: false,
  onToggleCountdown: () => {}, countdownLabel: "Adhan in", countdownClock: "-5:00",
  isToday: true, selectedDate: "2026-09-04", onDateChange: () => {},
  onToday: () => {}, showIqamahTime: true, formatTime: (value) => value,
};

test("Prayer exposes a date picker and honors the iqamah display preference", () => {
  const visible = renderToStaticMarkup(<MasjidlyHomeHero {...props} />);
  assert.doesNotMatch(visible, /Select mosque/);
  assert.match(visible, /type="date"/);
  assert.match(visible, /value="2026-09-04"/);
  assert.match(visible, /Iqamah: 05:30/);
  const hidden = renderToStaticMarkup(<MasjidlyHomeHero {...props} showIqamahTime={false} isToday={false} />);
  assert.doesNotMatch(hidden, /Iqamah: 05:30/);
  assert.match(hidden, /Back to today/);
});

test("Country selection scopes cities and same-named city mosques", () => {
  const uk: Mosque = {
    id: "uk-mosque", slug: "uk-mosque", name: "UK mosque", address: "Test address",
    lat: 0, lng: 0, citySlug: "shared-city", cityName: "Shared city",
    countryCode: "GB", countryName: "United Kingdom", timezone: "Europe/London",
  };
  const overseas: Mosque = { ...uk, id: "overseas-mosque", slug: "overseas-mosque", countryCode: "US", countryName: "United States" };
  function SelectionProbe() {
    const selection = usePersistedMosque([uk, overseas], overseas);
    assert.equal(selection.selectedCountryCode, "US");
    assert.deepEqual(selection.countryOptions.map((country) => country.id), ["GB", "US"]);
    assert.deepEqual(selection.cityOptions.map((city) => city.id), ["shared-city"]);
    assert.deepEqual(selection.mosquesInSelectedCity.map((mosque) => mosque.id), ["overseas-mosque"]);
    return null;
  }
  renderToStaticMarkup(<SelectionProbe />);
});

test("Modern skies use the Masjidly set2 palette and matching foregrounds", () => {
  assert.equal(MASJIDLY_MODERN_SKIES.maghrib.sky, "linear-gradient(180deg, #F2D7D9 0%, #E786A7 100%)");
  assert.equal(MASJIDLY_MODERN_SKIES.isha.sky, "linear-gradient(180deg, #000328 0%, #00458E 100%)");
  assert.equal(textColorForTheme("maghrib"), "#111111");
  assert.equal(textColorForTheme("isha"), "#FFFFFF");
});

test("Night icon is three four-point stars and sunset uses a downward arrow", () => {
  const night = renderToStaticMarkup(<PrayerSunPhaseIcon theme="isha" color="#FFFFFF" />);
  assert.equal((night.match(/<path /g) ?? []).length, 3);
  assert.equal((night.match(/ Q/g) ?? []).length, 12);
  assert.equal(renderToStaticMarkup(<PrayerSunPhaseIcon theme="tahajjud" color="#FFFFFF" />), night);
  const sunset = renderToStaticMarkup(<PrayerSunPhaseIcon theme="maghrib" />);
  assert.match(sunset, /M50 31.2 V39.2 M47 36.2 L50 39.2 L53 36.2/);
});
