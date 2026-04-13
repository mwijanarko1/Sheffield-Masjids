# Sheffield Masjids

Prayer times, iqamah times, and masjid locations for Sheffield, built with Next.js App Router.

## Features

- Daily prayer + iqamah schedule per masjid
- Friday Jummah handling
- Compare view across Sheffield masjids (`/compare`)
- Last 10 nights Ramadan checklist (`/last-ten`) — with saved progress and night switcher
- Dedicated masjid pages (`/mosques/[slug]`)
- Monthly timetable browser (`/mosques/[slug]/timetable` and global `/timetable`)
- Ramadan-only timetable support (`/mosques/[slug]/ramadan-timetable`)
- UK DST-aware prayer logic (embedded-DST detection and remapping)
- ICS calendar export for monthly prayer times
- Convex live backend (optional) with static JSON fallback
- Location map for each mosque
- Sun path visualization
- Dynamic backgrounds and floating bottom navigation

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Backend:** Convex (real-time DB) — optional, falls back to static JSON
- **Package Manager:** Bun
- **Analytics:** Vercel Analytics
- **Time Libraries:** `adhan` (devDep), `moment-hijri`, custom DST logic

## Requirements

- Node.js `>=20.9.0`
- [Bun](https://bun.sh)

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```
2. Run development server:
   ```bash
   bun run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local` and set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>  # Optional — enables live backend
```

- `NEXT_PUBLIC_SITE_URL` — Used for canonical URLs, `robots.txt`, and `sitemap.xml`. Falls back to `http://localhost:3000` if unset.
- `NEXT_PUBLIC_CONVEX_URL` — When set, the app queries Convex for mosque registry, monthly prayer times, Ramadan timetables, and UK DST dates. Falls back to static JSON in `public/data/` if unset.

## SEO Setup

- Global metadata in `src/app/layout.tsx` (title template, Open Graph, Twitter, robots)
- Route-level canonical metadata for `/`, `/compare`, `/mosques/[slug]`, and key static pages
- Dynamic `robots.txt` in `src/app/robots.ts`
- Dynamic `sitemap.xml` in `src/app/sitemap.ts` (includes home, compare, timetable, and indexable masjid pages)
- JSON-LD structured data for mosques and the website

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home — mosque selector, today's prayer times, map, compare link |
| `/compare` | Cross-masjid prayer comparison |
| `/last-ten` | Last 10 nights Ramadan checklist with saved progress |
| `/timetable` | Global timetable browser (all mosques, tabbed by month) |
| `/mosques/[slug]` | Individual masjid detail page with map |
| `/mosques/[slug]/timetable` | Monthly prayer timetable |
| `/mosques/[slug]/ramadan-timetable` | Ramadan-only timetable |
| `/settings` | App settings (mosque preference, legal links) |
| `/privacy` | Privacy policy |
| `/terms` | Terms & conditions |
| `/new-domain` | Domain redirect notice |

## Data Source Structure

```text
public/
  data/
    mosques.json                  # Static mosque registry (id, name, address, lat, lng, slug, website)
    mosques/
      [slug]/
        january.json … december.json   # Monthly prayer + iqamah times
        ramadan.json                   # Optional Ramadan timetable
  docs/
    dst-start-end.json            # UK DST transition dates
```

Each monthly JSON file contains:
- `prayer_times` — adhan times for each day
- `iqamah_times` — iqamah time ranges for each prayer
- `jummah_iqamah` — Friday Jummah iqamah time

### Convex Integration (Optional)

When `NEXT_PUBLIC_CONVEX_URL` is set, the app uses a live backend:

| Convex Table | Purpose |
|-------------|---------|
| `mosques` | Mosque registry |
| `monthlyPrayerTimes` | Monthly prayer + iqamah data |
| `ramadanTimetables` | Ramadan-only schedules |
| `ukDstCalendar` | UK DST transition dates |

| Convex Function | Type | Purpose |
|----------------|------|---------|
| `mosques:list` | Query | Fetch all mosques |
| `mosques:upsert` | Mutation | Add/update a mosque |
| `prayerTimes:getMonthly` | Query | Get monthly prayer times |
| `prayerTimes:getRamadan` | Query | Get Ramadan timetable |
| `prayerTimes:getUkDstDates` | Query | Get UK DST dates |
| `seed.*` | Mutations | Seed data from JSON |

**Data flow:** All data access tries Convex first, falls back to static JSON. When Convex is configured, new masjids can be added without redeploying the site.

## Architecture

### Dual Data Layer

```
┌─────────────────────────────────────────────────────┐
│  Client (PrayerTimesEnhancer)                        │
│  - Hydrates SSR data with real-time Convex queries   │
└─────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────┐
│  Server (SSR)                                        │
│  - lib/mosques.ts → Convex → static JSON fallback    │
│  - lib/prayer-times.ts → DST-aware lookup + caching  │
└─────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────┐
│  Convex Backend (optional)                           │
│  - mosques, monthlyPrayerTimes, ramadanTimetables    │
│  - ukDstCalendar for UK DST dates                    │
└─────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────┐
│  Static JSON (public/data/)                          │
│  - mosques.json + per-mosque monthly files           │
└─────────────────────────────────────────────────────┘
```

### Key Modules

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| **App Router** | Pages, routing, SEO metadata | `src/app/**/*.tsx`, `robots.ts`, `sitemap.ts` |
| **UI Components** | Reusable UI primitives | `src/components/ui/*`, `src/components/*.tsx` |
| **Data Access** | Mosque & prayer times retrieval | `src/lib/mosques.ts`, `src/lib/prayer-times.ts` |
| **Convex Backend** | Live database queries/mutations | `convex/*.ts`, `convex/*.js` |
| **State Management** | Client-side persistence | `src/hooks/use-persisted-mosque.ts`, `src/hooks/use-last-ten-checklist.ts` |
| **Calendar Export** | ICS generation | `src/features/calendar-export/` |
| **Site Config** | SEO constants, branding | `src/lib/site.ts` |

## Calendar Export

Located in `src/features/calendar-export/`:

- `lib/build-monthly-calendar-events.ts` — Converts monthly prayer data to ICS events
- `lib/ics.ts` — Generates valid ICS file content
- `lib/download-calendar-file.ts` — Triggers browser download

## Useful Commands

- `bun run dev` — Start local dev server
- `bun run build` — Production build
- `bun start` — Run production server
- `bun run lint` — Run linter
- `bunx tsc --noEmit` — Type-check
- `bun run seed:dev` — Seed Convex from `public/data` (dev deployment)

## Data & Scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-convex.ts` | Seed Convex mosque registry and prayer datasets from `public/data` |
| `scripts/fetch-masjid-sunnah-timetable.mjs` | Fetch and convert Masjid Sunnah timetable data |
| `scripts/convert-masjid-huda-docs.mjs` | Convert Masjid Huda timetable docs into project JSON |
| `scripts/convert-andalus.ts` | Convert Andalus timetable data |
| `scripts/fetch-madina-masjid-timetable.ts` | Fetch Madina Masjid timetable data |
| `scripts/update-madina-masjid-from-mawaqit.ts` | Update Madina Masjid data from Mawaqit |
| `scripts/compare-mawaqit-madina-masjid.ts` | Compare Mawaqit vs local Madina Masjid data |
| `scripts/update-sgm-adhan.ts` | Update Sheffield Grand Mosque adhan data |

## Adding a New Mosque

1. Add entry to `public/data/mosques.json` (idempotent with Convex upsert)
2. Create `public/data/mosques/[slug]/` with `january.json` through `december.json` (and optional `ramadan.json`)
3. Run `bun run seed:dev` to push to Convex dev deployment

## Known Risks

1. **Dual data layer complexity** — The Convex ↔ static JSON fallback pattern means bugs can manifest differently depending on whether Convex is configured. Any change to data access logic must be tested in both modes.
2. **DST logic complexity** — `lib/prayer-times.ts` contains intricate UK DST detection, embedded-DST timetable remapping, and sparse-data interpolation. Changes here carry regression risk.
3. **Large core engine** — `src/lib/prayer-times.ts` is the core engine and is very large. It should be considered for future decomposition into smaller modules (DST handling, Convex integration, Ramadan logic, monthly lookup).
4. **Client-side caching** — In-memory `Map` caches with TTL are not synchronized across tabs or server/client boundaries. Stale data may appear until TTL expiry.
5. **No E2E tests** — The codebase has unit tests for calendar export and DST logic, but no Playwright/E2E test infrastructure.

## License

MIT
