import type { CalendarEventInput, CalendarExportMode } from "@/features/calendar-export/types";

const ICS_PRODID = "-//Sheffield Masjids//Prayer Calendar Export//EN";
const ICS_TIMEZONE = "Europe/London";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateTimeStampUtc(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function formatDateTimeWallClock(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) {
    return line;
  }

  let result = "";
  let remaining = line;
  while (remaining.length > limit) {
    result += `${remaining.slice(0, limit)}\r\n `;
    remaining = remaining.slice(limit);
  }

  return `${result}${remaining}`;
}

function formatProperty(name: string, value: string): string {
  return foldLine(`${name}:${escapeIcsText(value)}`);
}

function formatTimedProperty(name: string, value: Date): string {
  return `${name};TZID=${ICS_TIMEZONE}:${formatDateTimeWallClock(value)}`;
}

function buildEventBlock(event: CalendarEventInput, timestamp: Date): string {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateTimeStampUtc(timestamp)}`,
    formatTimedProperty("DTSTART", event.start),
    formatTimedProperty("DTEND", event.end),
    formatProperty("SUMMARY", event.title),
    formatProperty("DESCRIPTION", event.description),
    formatProperty("LOCATION", event.location),
    "END:VEVENT",
  ].join("\r\n");
}

export function createCalendarFilename(
  mosqueSlug: string,
  monthLabel: string,
  year: number,
  mode: CalendarExportMode,
): string {
  const safeMonth = monthLabel.trim().toLowerCase().replace(/\s+/g, "-");
  return `${mosqueSlug}-${safeMonth}-${year}-${mode}.ics`;
}

export function buildIcsCalendar(events: CalendarEventInput[], now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.map((event) => buildEventBlock(event, now)),
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
