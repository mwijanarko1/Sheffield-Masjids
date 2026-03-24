# Monthly Calendar Export for Prayer Times

## Summary

Add a calendar export feature to the monthly mosque timetable so users can export the currently selected month’s schedule into their calendar.

The first release will:
- live on the monthly timetable surface only
- open a modal from the monthly timetable header
- let the user choose `Adhan only`, `Iqamah only`, or `Adhan + Iqamah`
- generate a single `.ics` file for the selected month and selected mosque
- support Apple Calendar directly via `.ics`
- support Google Calendar via `.ics` download plus brief import guidance in the modal

This release will not attempt a Google-specific multi-event deep link, because that is not a robust fit for whole-month exports.

## Implementation Plan

### 1. Add a codebase map before implementation
Create [`docs/CODEBASE_MAP.md`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/docs/CODEBASE_MAP.md) first because the repo currently has no map and the local agent contract expects one before substantial changes.

Contents should cover:
- `src/app` routes, especially timetable-related pages
- `src/components` timetable widgets and shared UI primitives
- `src/lib/prayer-times.ts` as the main prayer-time data source
- any new calendar-export feature folder added below

### 2. Introduce a feature-local calendar export module
Create a feature folder to keep this isolated from generic shared UI:

- [`src/features/calendar-export/types.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/types.ts)
- [`src/features/calendar-export/lib/build-monthly-calendar-events.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/build-monthly-calendar-events.ts)
- [`src/features/calendar-export/lib/ics.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/ics.ts)
- [`src/features/calendar-export/lib/download-calendar-file.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/download-calendar-file.ts)
- [`src/features/calendar-export/components/MonthlyCalendarExportModal.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/components/MonthlyCalendarExportModal.tsx)

Keep the feature client-side. No API route is required for v1.

### 3. Define the event model explicitly
In `types.ts`, define the calendar export types so the implementer does not improvise shape later.

Required types:
- `CalendarExportMode = "adhan" | "iqamah" | "both"`
- `CalendarProvider = "apple" | "google" | "ics"`
- `CalendarEventKind = "adhan" | "iqamah"`
- `CalendarEventInput`
- `MonthlyCalendarExportRequest`

`CalendarEventInput` fields:
- `uid: string`
- `title: string`
- `description: string`
- `location: string`
- `start: Date`
- `end: Date`
- `allDay: false`
- `kind: CalendarEventKind`

### 4. Build month events from existing timetable data
Use [`src/components/MonthlyTimetable.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/components/MonthlyTimetable.tsx) as the source of integration, but do not rebuild row logic ad hoc inside the modal.

Refactor the monthly row-building logic into a reusable pure helper so both the table and export flow share the same source of truth.

Recommended extraction:
- create a pure helper in [`src/features/calendar-export/lib/build-monthly-calendar-events.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/build-monthly-calendar-events.ts)
- optionally create a small shared monthly-row helper near [`src/components/MonthlyTimetable.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/components/MonthlyTimetable.tsx) if needed, but keep export formatting concerns in the feature module

Event generation rules:
- use the currently selected mosque
- use the currently selected month and Sheffield year already shown in the UI
- load data through `loadMonthlyPrayerTimes`
- derive iqamah times with `getIqamahTimesForDate` and `getIqamahTime`, matching the timetable table
- create events only for valid concrete times
- skip placeholder values like `"-"`, `"—"`, `"--:--"`, and `"After Maghrib"`
- do not create sunrise events
- do not create a separate Jummah event in v1, since the requested export scope is prayer adhan/iqamah and the existing table’s Friday special case is not modeled as a monthly per-row standalone event
- use Sheffield timezone semantics for all event timestamps

Per-day exportable prayers:
- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha

Duration rules:
- adhan events: 1 minute
- iqamah events: 15 minutes

Title format:
- adhan: `{Prayer} Adhan - {Mosque Name}`
- iqamah: `{Prayer} Iqamah - {Mosque Name}`

Description format:
- first line: `{Prayer} {kind} for {Mosque Name}`
- second line: `Sheffield Masjids monthly timetable export`
- third line: `Month: {Month Name} {Year}`

Location:
- use `mosque.address` when present
- fallback to `mosque.name`

UID format:
- stable per event, for example:
  `{mosque.slug}-{year}-{month}-{day}-{prayer}-{kind}@sheffieldmasjids`

### 5. Generate a standards-safe ICS file
In [`src/features/calendar-export/lib/ics.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/ics.ts), build a minimal RFC5545-compatible ICS string.

Required ICS behavior:
- output `BEGIN:VCALENDAR` / `END:VCALENDAR`
- include `VERSION:2.0`
- include `PRODID:-//Sheffield Masjids//Prayer Calendar Export//EN`
- use one `VEVENT` per exported event
- include `UID`
- include `DTSTAMP`
- include `DTSTART`
- include `DTEND`
- include `SUMMARY`
- include `DESCRIPTION`
- include `LOCATION`
- escape commas, semicolons, backslashes, and newlines correctly
- fold long lines if needed
- use timezone-aware local timestamps with `TZID=Europe/London`
- keep all exported events timed, not all-day

Filename format:
- `{mosque-slug}-{month-name}-{year}-{mode}.ics`

### 6. Add a modal-based export UI
Use the existing sheet primitive from [`src/components/ui/sheet.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/components/ui/sheet.tsx) as the modal implementation for consistency.

Add the trigger to [`src/components/MonthlyTimetable.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/components/MonthlyTimetable.tsx), in the header area near the month title/navigation.

Modal contents:
- title: `Add Month to Calendar`
- short description naming the selected mosque and selected month
- radio-style choice for:
  - `Adhan Only`
  - `Iqamah Only`
  - `Adhan + Iqamah`
- provider actions:
  - `Apple / ICS Download`
  - `Google Calendar`
- short helper text under Google:
  `Monthly exports download an .ics file that can be imported into Google Calendar.`
- cancel button
- loading state while generating the file
- inline error message if generation fails

Interaction rules:
- modal opens from a single visible button in the monthly timetable header
- default selection in the modal: `Iqamah Only`
- changing mode updates only local modal state
- clicking either provider action generates the same ICS file in v1
- the Google button also shows the import hint text in the modal; no external Google URL is opened
- after successful download, keep the modal open and show a small success message, or close automatically after download if that fits the existing UX better; default to closing automatically after download to reduce extra state

### 7. Keep the UI integration narrow
Only modify the monthly timetable page flow for v1:
- [`src/components/MonthlyTimetable.tsx`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/components/MonthlyTimetable.tsx)

Do not add this to:
- homepage timetable tab
- daily prayer widget
- Ramadan timetable
- settings page

### 8. Handle month/year/date correctness carefully
Use the same Sheffield date logic already present in [`src/lib/prayer-times.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/lib/prayer-times.ts).

Rules:
- event dates must correspond to the selected month currently shown in the timetable UI
- use the `currentYear` already derived in the monthly timetable for v1
- build local event timestamps for `Europe/London`
- do not convert them to UTC before serializing if using `TZID=Europe/London` ICS entries

Known limitation to document in code comments and plan notes:
- the current timetable UI only supports a selected month in the current Sheffield year, so calendar export inherits that behavior

## Public API / Interface Changes

### New internal feature interfaces
Add new internal types for calendar export:
- `CalendarExportMode`
- `CalendarProvider`
- `CalendarEventInput`
- `MonthlyCalendarExportRequest`

### New component interface
`MonthlyCalendarExportModal` props:
- `mosque: Mosque`
- `month: number`
- `year: number`
- `monthLabel: string`
- `triggerClassName?: string`

This component should own:
- export-mode state
- open/close state if convenient
- download action handling
- loading/error UI

### No external API changes
This feature does not add:
- new server routes
- database schema changes
- Convex changes
- public URL/query param changes

## Test Cases and Scenarios

### Unit tests
Add tests for the event builder and ICS serializer.

Recommended files:
- [`src/features/calendar-export/lib/build-monthly-calendar-events.test.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/build-monthly-calendar-events.test.ts)
- [`src/features/calendar-export/lib/ics.test.ts`](/Users/mikhail/Documents/CURSOR%20CODES/Deployed/Sheffield-Masjids/src/features/calendar-export/lib/ics.test.ts)

Cover:
- `adhan` mode exports only adhan events
- `iqamah` mode exports only iqamah events
- `both` mode exports both sets
- placeholder values are skipped
- `After Maghrib` is skipped
- generated titles/descriptions/locations are correct
- adhan end time is exactly 1 minute after start
- iqamah end time is exactly 15 minutes after start
- UID format is stable
- ICS escaping works for commas, semicolons, and line breaks
- ICS contains required calendar and event fields

### Component behavior checks
If the repo already has a test setup, add component tests for:
- modal opens from the monthly timetable header
- default selection is `Iqamah Only`
- changing selection updates the chosen export mode
- clicking Apple/ICS triggers generation
- clicking Google also triggers ICS generation and shows/import guidance copy

If no component test harness exists, at minimum verify manually during implementation.

### Manual verification
Test these flows manually:
- export current month for a mosque with full monthly data
- export `Adhan Only`
- export `Iqamah Only`
- export `Adhan + Iqamah`
- import resulting `.ics` into Apple Calendar
- import resulting `.ics` into Google Calendar
- verify event timestamps render correctly in `Europe/London`
- verify mobile modal layout and button tap targets
- verify failure state if monthly data load fails

## Assumptions and Defaults

- The feature is web-only and client-side for v1.
- The first release targets the monthly timetable page only.
- Whole-month export uses `.ics` for every provider path in practice.
- The Google button is a guided `.ics` export flow, not a bulk Google deep link.
- Default mode in the modal is `Iqamah Only`.
- Exported prayers are Fajr, Dhuhr, Asr, Maghrib, and Isha only.
- Sunrise is excluded.
- Jummah is excluded from v1 monthly export to avoid ambiguous monthly modeling and duplicated Friday noon entries.
- Adhan duration is 1 minute.
- Iqamah duration is 15 minutes.
- The selected month’s export uses the current Sheffield year already used by the timetable page.
- If `mosque.address` is missing, `mosque.name` is used as the event location.
- Repo hygiene step before implementation: create `docs/CODEBASE_MAP.md` because it is currently missing.
