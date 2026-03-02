# Sheffield Masjids

Prayer times, iqamah times, and masjid locations for Sheffield, built with Next.js App Router.

## Features

- Daily prayer + iqamah schedule per masjid
- Friday Jummah handling
- Compare view across Sheffield masjids (`/compare`)
- Dedicated masjid pages (`/mosques/[slug]`)
- Ramadan-only timetable support (`ramadan.json`)
- UK DST-aware prayer logic

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Local JSON data in `public/data`

## Requirements

- Node.js `>=20.9.0`
- npm

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local` and set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

This value is used for canonical URLs, `robots.txt`, and `sitemap.xml`.  
If not set, the app falls back to `http://localhost:3000`.

## SEO Setup

- Global metadata in `src/app/layout.tsx` (title template, Open Graph, Twitter, robots)
- Route-level canonical metadata for `/`, `/compare`, `/mosques/[slug]`, and key static pages
- Dynamic `robots.txt` in `src/app/robots.ts`
- Dynamic `sitemap.xml` in `src/app/sitemap.ts` (includes home, compare, and indexable masjid pages)

## Routes

- `/` Home (mosque selector, prayer times, map, compare)
- `/compare` Cross-masjid prayer comparison
- `/mosques/[slug]` Individual masjid detail page
- `/mosques/[slug]/timetable` Monthly prayer timetable
- `/mosques/[slug]/ramadan-timetable` Ramadan timetable
- `/settings` App settings (mosque preference, links to legal pages)
- `/privacy` Privacy policy
- `/terms` Terms & conditions
- `/new-domain` New domain / redirect notice (if used)

## Data Source Structure

```text
public/
  data/
    mosques.json
    mosques/
      [slug]/
        january.json ... december.json
        ramadan.json (optional)
  docs/
    dst-start-end.json
```

`mosques.json` defines each masjid (`id`, `name`, `address`, `lat`, `lng`, `slug`, optional `website`) and is used as fallback/bootstrap data.

When Convex is configured, production reads mosque metadata from the `mosques` table and prayer data from `monthlyPrayerTimes` / `ramadanTimetables`, so new masjids can be added without redeploying the site.

Each monthly JSON file contains:
- `prayer_times`
- `iqamah_times`
- `jummah_iqamah`

## Useful Commands

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm start` - run production server
- `npm run lint` - run linter
- `npx tsc --noEmit` - type-check

## Data & Scripts

- `scripts/seed-convex.ts` - seed Convex mosque registry and prayer datasets from `public/data`
- `scripts/fetch-masjid-sunnah-timetable.mjs` - fetch and convert Masjid Sunnah timetable data
- `scripts/convert-masjid-huda-docs.mjs` - convert Masjid Huda timetable docs into project JSON format
- `scripts/convert-andalus.ts` - convert Andalus timetable data
- `scripts/fetch-madina-masjid-timetable.ts` - fetch Madina Masjid timetable data
- `scripts/update-madina-masjid-from-mawaqit.ts` - update Madina Masjid data from Mawaqit
- `scripts/compare-mawaqit-madina-masjid.ts` - compare Mawaqit vs local Madina Masjid data
- `scripts/update-sgm-adhan.ts` - update Sheffield Grand Mosque adhan data

## License

MIT
