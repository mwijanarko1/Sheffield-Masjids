# Todo

## Plan (Closest Masjid Reliability)

- [x] Audit `HomeHeaderCards` geolocation + nearest-masjid state flow and identify failure points.
- [x] Implement resilient location handling (loading/error/unsupported/permission-denied/retry) and robust nearest-masjid selection.
- [x] Run `npx tsc --noEmit` and capture review notes for the fix.

## Review (Closest Masjid Reliability)

- Removed the hidden-mosque filter from `HomeHeaderCards` so nearest lookup now considers every masjid in `public/data/mosques.json`.
- Replaced implicit location behavior with explicit status handling (`idle`, `loading`, `success`, `unsupported`, `denied`, `error`) to avoid ambiguous stuck states.
- Added a `Retry location` action so users can re-request geolocation after denial/failure without reloading the page.
- Hardened nearest-masjid calculation by validating coordinates with `Number.isFinite` before distance math.
- Closest card now shows both masjid name and computed proximity (`m`/`km`) for transparent behavior.
- Verification: `npx tsc --noEmit` passed.

## Plan (Persist Mosque Choice)

- [x] Add a dedicated persistence hook for selected mosque in `src/hooks/use-persisted-mosque.ts`.
- [x] Replace local `useState` in `HomeContent` with the new hook while preserving existing selection UI behavior.
- [x] Run `npx tsc --noEmit` and document verification in a new review section.

## Review (Persist Mosque Choice)

- Added `src/hooks/use-persisted-mosque.ts` with:
  - local state initialized from the first mosque.
  - mount effect that reads `selected-mosque-id` from `localStorage` and restores matching mosque.
  - update effect that persists the selected mosque ID back into `localStorage`.
- Updated `src/components/HomeContent.tsx` to consume `usePersistedMosque(mosques)` instead of local `useState`.
- Verification: `npx tsc --noEmit` passed.

## Plan (Jummah Row In Widget)

- [x] Add `JUMMAH` to the prayer rows list in `PrayerTimesWidget` under `ISHA`.
- [x] Source the row from mosque `jummah` iqamah data with safe fallback display.
- [x] Run type-check and record verification.

## Review (Jummah Row In Widget)

- Added `JUMMAH` row to the main widget timing list so it appears directly beneath `ISHA`.
- Row shows adhan as `--:--` and iqamah from `adjustedIqamahTimes.jummah` (fallback `--:--`).
- Verification: `npx tsc --noEmit` passed.

## Plan (Timetable CTA Placement Fix)

- [x] Move full timetable CTA from home selector area into the prayer widget.
- [x] Position CTA directly under the prayer timing rows (after Isha row).
- [x] Run type-check and capture verification notes.

## Review (Timetable CTA Placement Fix)

- Removed the duplicate `View full month timetable` button from `HomeContent`.
- Added the button inside `PrayerTimesWidget`, rendered immediately after the prayer rows so it appears beneath Isha timing.
- Verification: `npx tsc --noEmit` passed.

## Plan (Desktop Responsiveness Pass)

- [x] Increase desktop max-width containers on header and page shells so core UI can expand.
- [x] Scale `PrayerTimesWidget` spacing/typography at `xl` breakpoints for large screens.
- [x] Run type-check and document review notes.

## Review (Desktop Responsiveness Pass)

- Expanded shell widths:
  - `src/components/Header.tsx` from `max-w-4xl` to `max-w-6xl xl:max-w-7xl`.
  - `src/app/page.tsx` and `src/app/compare/page.tsx` from `max-w-4xl` to `max-w-6xl xl:max-w-7xl`.
  - `src/app/mosques/[slug]/page.tsx` from `max-w-2xl` to `max-w-5xl xl:max-w-6xl`.
- Improved large-screen adaptability in `src/components/PrayerTimesWidget.tsx` with `xl` sizing for card radius, padding, row gaps, and key text sizes.
- Verification: `npx tsc --noEmit` passed.

## Plan (Home Monthly Timetable CTA)

- [x] Add monthly timetable route back at `/mosques/[slug]/timetable`.
- [x] Build a reusable monthly timetable client component with month selector + daily rows.
- [x] Add a home-page button that opens selected mosque's full-month timetable.
- [x] Run type-check and capture review notes.

## Review (Home Monthly Timetable CTA)

- Added a new route at `/mosques/[slug]/timetable` with slug validation and hidden-mosque guard.
- Built `MonthlyTimetable` client component with month selection, monthly fetch, desktop table view, and mobile card view for full-month adhan/iqamah data.
- Added `View full month timetable` button on home, wired to the currently selected mosque in the dropdown.
- Verified with `npx tsc --noEmit` (pass).

## Plan

- [x] Implement mosque-first landing flow (select first, reveal content after).
- [x] Add dropdown reveal for prayer widget and map.
- [x] Add `Compare Prayer Times` expandable table.
- [x] Add `View Full Timetable` monthly page and routing.
- [x] Validate type-safety and document review notes.

## Plan (Dashboard Redesign)

- [x] Define dashboard visual tokens/layout primitives in global styles.
- [x] Redesign homepage shell and mosque selection area into dashboard panels.
- [x] Restyle prayer widget, compare table, map card, and jummah card to dashboard visuals.
- [x] Redesign mosque detail and timetable routes with consistent dashboard navigation and panel hierarchy.
- [x] Run type-check and capture implementation review notes.

## Review (Dashboard Redesign)

- Shifted the UI from stacked content cards to a dashboard system with control rail + live data panels on home, mosque detail, and timetable routes.
- Introduced global dashboard visual language in `src/app/globals.css`: new color tokens, atmospheric background layers, grid texture overlay, and shared entrance animation utility.
- Updated shared primitives (`Button`, `Card`, `Select`, `Table`) to carry the dashboard look across all screens.
- Reworked `HomeContent` into operational panels: Control Panel, Masjid Overview, Live Prayer Board, Location Panel, and Network Comparison.
- Restyled `PrayerTimesWidget`, `ComparePrayerTimes`, `MonthlyTimetable`, `MosqueMap`, and `JummahWidget` to align with the dashboard system.
- Verified with `npx tsc --noEmit` (pass).
- `npm run build` failed in sandbox because `next/font` could not fetch Google Fonts (`Geist`, `Geist Mono`) due blocked network.
- `npm run lint` currently fails due existing project script behavior (`next lint` resolves `lint` as a missing directory in this environment).

## Plan (Dashboard V2 Theme)

- [x] Replace dashboard palette with OpenAI-like dark neutrals and blue accents (no green).
- [x] Rework home route shell into reference-style nav + hero + action row.
- [x] Restructure home dashboard content to match card row + data grid feel.
- [x] Restyle shared UI primitives and key widgets/tables for dark dashboard consistency.
- [x] Re-run type-check and capture review notes.

## Review (Dashboard V2 Theme)

- Home route now follows reference structure: dark top navigation, hero heading/actions, and compact KPI summary row.
- Dashboard body was reshaped into a dual-column board with a main timing grid panel and a right-side contextual stack.
- Added board tabs (`All Masjids`, `Selected`, `Map`) to switch the main board mode quickly.
- Removed green accents and replaced palette with dark neutrals + blue highlights across global tokens and component gradients.
- Updated shared UI primitives (`Card`, `Button`, `Select`, `Table`) to align with the dark OpenAI-style visual language.
- Restyled key data surfaces (`ComparePrayerTimes`, `PrayerTimesWidget`, `MonthlyTimetable`, `MosqueMap`, `JummahWidget`) to avoid mixed light-theme remnants.
- Verified with `npx tsc --noEmit` (pass).

## Review

- Reworked home UX to match requested sequence: user selects a masjid first, then prayer/map sections drop down.
- Added compare button with an expandable cross-masjid prayer comparison table.
- Added full timetable button and new monthly timetable route per masjid (`/mosques/[slug]/timetable`).
- Ported theme palette from `/Users/mikhail/Documents/CURSOR CODES/Deployed/Job Application Tracker` into global tokens and key gradients.
- Added mobile-first responsive data presentation: compare + timetable now render stacked cards on small screens and full tables on desktop.
- Increased reveal panel height caps to avoid clipping expanded content on mobile.
- Migrated key screens to shadcn-style UI primitives (`Button`, `Card`, `Select`, `Table`) and updated route/page wrappers to use them.
- Verified against shadcn docs pages for installation/components before implementation.
- `npx tsc --noEmit` passed.

## Plan (MWHS/Risalah Timing Parity)

- [x] Compare MWHS vs Risalah timing sources to isolate mismatch scope.
- [x] Fix the source data causing divergent timing behavior.
- [x] Verify parity for Ramadan source data after the update.

## Review (MWHS/Risalah Timing Parity)

- Root cause was stale Ramadan metadata in `masjid-risalah/ramadan.json` (`gregorian_start`/`gregorian_end` were for 2025).
- On `2026-02-18`, MWHS entered Ramadan flow while Risalah fell back to monthly data, causing different displayed timings.
- Updated `masjid-risalah/ramadan.json` to match MWHS Ramadan data so both now resolve identical timings during Ramadan.

## Plan (Compare Table Jummah Row)

- [x] Add a dedicated `Jummah` row in the compare prayers list.
- [x] Wire the row to mosque `jummah_iqamah` values.
- [x] Run type-check verification and document any pre-existing blockers.

## Review (Compare Table Jummah Row)

- Added explicit `Jummah` row to `ComparePrayerTimes` so it appears in the comparison table for all dates.
- `Jummah` now displays `—` for adhan and uses `iqamahTimes.jummah` for iqamah per mosque.
- Kept `Dhuhr` as `Dhuhr` (no Friday label swap) so both rows are visible independently.
- `npx tsc --noEmit` still fails due pre-existing project issues in `.next/types/validator.ts` and `src/components/ui/sheet.tsx`, unrelated to this change.

## Plan (README + SEO Refresh)

- [x] Update global SEO metadata in `layout.tsx` and establish canonical base URL behavior.
- [x] Add technical SEO routes (`robots.ts`, `sitemap.ts`) with mosque route coverage.
- [x] Add route-specific metadata for compare and mosque detail pages.
- [x] Rewrite `README.md` to match current project architecture and operations.
- [x] Run type-check and document review outcomes.

## Review (README + SEO Refresh)

- Added centralized SEO/site config in `src/lib/site.ts` (`SITE_NAME`, `SITE_DESCRIPTION`, base URL + hidden mosque slug set).
- Upgraded root metadata in `src/app/layout.tsx` with `metadataBase`, title template, Open Graph, Twitter, robots directives, and `themeColor`.
- Added crawler endpoints:
  - `src/app/robots.ts` for global crawl rules and sitemap pointer.
  - `src/app/sitemap.ts` for `/`, `/compare`, and indexable mosque pages.
- Added route-specific metadata:
  - canonical `/` in `src/app/page.tsx`
  - canonical + OG/Twitter for `/compare` in `src/app/compare/page.tsx`
  - dynamic canonical + OG/Twitter for `/mosques/[slug]` in `src/app/mosques/[slug]/page.tsx`
- Rewrote `README.md` to match current routes, data model, SEO setup, and required env configuration.
- Added `.env.example` and updated `.gitignore` to allow committing it.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm run lint` fails due existing script behavior (`next lint` treated `lint` as a directory argument in this environment).
