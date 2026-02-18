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
- Route-level canonical metadata:
  - `/` in `src/app/page.tsx`
  - `/compare` in `src/app/compare/page.tsx`
  - `/mosques/[slug]` in `src/app/mosques/[slug]/page.tsx`
- Dynamic `robots.txt` in `src/app/robots.ts`
- Dynamic `sitemap.xml` in `src/app/sitemap.ts` (includes home, compare, and indexable masjid pages)

## Routes

- `/` Home (selector + prayer times + map)
- `/compare` Cross-masjid prayer comparison
- `/mosques/[slug]` Individual masjid detail page

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

`mosques.json` defines each masjid (`id`, `name`, `address`, `lat`, `lng`, `slug`, optional `website`).

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

## Data Update Scripts

- `scripts/fetch-masjid-sunnah-timetable.mjs` - fetch + convert Masjid Sunnah timetable data
- `scripts/convert-masjid-huda-docs.mjs` - convert Masjid Huda timetable docs into project JSON format

## License

MIT
