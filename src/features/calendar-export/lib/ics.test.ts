import test from "node:test";
import assert from "node:assert/strict";
import { buildIcsCalendar, createCalendarFilename } from "@/features/calendar-export/lib/ics";
import type { CalendarEventInput } from "@/features/calendar-export/types";

const event: CalendarEventInput = {
  uid: "uid-1@sheffieldmasjids",
  title: "Fajr Adhan - Test Masjid",
  description: "Line one;\nLine two, with comma",
  location: "1 Test Street, Sheffield",
  start: new Date(Date.UTC(2026, 3, 1, 5, 14, 0)),
  end: new Date(Date.UTC(2026, 3, 1, 5, 15, 0)),
  allDay: false,
  kind: "adhan",
};

test("buildIcsCalendar renders required VCALENDAR and VEVENT fields", () => {
  const ics = buildIcsCalendar([event], new Date(Date.UTC(2026, 2, 24, 12, 0, 0)));

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /VERSION:2.0/);
  assert.match(ics, /PRODID:-\/\/Sheffield Masjids\/\/Prayer Calendar Export\/\/EN/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /UID:uid-1@sheffieldmasjids/);
  assert.match(ics, /DTSTAMP:20260324T120000Z/);
  assert.match(ics, /DTSTART;TZID=Europe\/London:20260401T051400/);
  assert.match(ics, /DTEND;TZID=Europe\/London:20260401T051500/);
  assert.match(ics, /SUMMARY:Fajr Adhan - Test Masjid/);
  assert.match(ics, /LOCATION:1 Test Street\\, Sheffield/);
  assert.match(ics, /DESCRIPTION:Line one\\;\\nLine two\\, with comma/);
  assert.match(ics, /END:VEVENT/);
  assert.match(ics, /END:VCALENDAR/);
});

test("createCalendarFilename normalizes month name and mode", () => {
  assert.equal(
    createCalendarFilename("test-masjid", "April", 2026, "both"),
    "test-masjid-april-2026-both.ics",
  );
});
