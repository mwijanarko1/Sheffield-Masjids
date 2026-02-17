# Sheffield Masjids

Prayer times, locations, and links for mosques across Sheffield.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS v4
- **Build**: Turbopack
- **Calendar**: moment-hijri (Hijri dates)

## Features

- **Prayer times** – Daily adhan and iqamah times per mosque (UK/Sheffield timezone)
- **Jummah times** – Friday prayer times
- **Interactive map** – Mosque locations with markers
- **Individual mosque pages** – `/mosques/[slug]` with address, website, map, and prayer times
- **Ramadan support** – Optional `ramadan.json` per mosque for special schedules
- **DST handling** – UK daylight saving adjustments
- **Dark mode** – System-aware theme

## Getting Started

### Prerequisites

- Node.js v18 or higher

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd Sheffield-Masjids
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── public/
│   └── data/
│       ├── mosques.json           # Mosque list (id, name, address, lat, lng, slug, website)
│       ├── docs/
│       │   └── dst-start-end.json # UK DST dates
│       └── mosques/
│           └── [slug]/            # Per-mosque data
│               ├── january.json   # Monthly prayer times + iqamah ranges
│               ├── february.json
│               ├── ...           # (monthly files)
│               └── ramadan.json   # Optional Ramadan schedule
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home page
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── mosques/[slug]/page.tsx # Mosque detail page
│   ├── components/
│   │   ├── HomeContent.tsx        # Mosque selector, prayer times, map
│   │   ├── PrayerTimesWidget.tsx  # Prayer + iqamah display, date picker
│   │   ├── JummahWidget.tsx       # Jummah time card
│   │   └── MosqueMap.tsx          # Map with mosque marker
│   ├── lib/
│   │   └── prayer-times.ts        # Prayer time loading, DST, Ramadan logic
│   └── types/
│       └── prayer-times.ts        # Mosque, PrayerTime, IqamahTimeRange, etc.
└── docs/                          # Project documentation
```

## Data Format

### mosques.json

```json
{
  "mosques": [
    {
      "id": "masjid-al-huda-sheffield",
      "name": "Masjid al Huda Sheffield",
      "address": "62-64 Earsham St, Sheffield S4 7LS",
      "lat": 53.3921,
      "lng": -1.4632,
      "slug": "masjid-al-huda-sheffield",
      "website": "https://masjidhudasheff.com"
    }
  ]
}
```

### Monthly prayer times (`public/data/mosques/[slug]/february.json`)

```json
{
  "month": "FEBRUARY",
  "prayer_times": [
    { "date": 1, "fajr": "06:03", "shurooq": "07:49", "dhuhr": "12:21", "asr": "14:25", "maghrib": "16:51", "isha": "18:30" },
    { "date": 15, "fajr": "05:41", ... },
    { "date": 28, "fajr": "05:15", ... }
  ],
  "iqamah_times": [
    { "date_range": "1-10", "fajr": "06:15", "dhuhr": "12:45", "asr": "15:00", "isha": "19:00" },
    { "date_range": "11-20", ... },
    { "date_range": "21-28", ... }
  ],
  "jummah_iqamah": "12:30"
}
```

Prayer times can be sparse (e.g. dates 1, 15, 28); the app interpolates for other days.

## Adding a Mosque

1. Add an entry to `public/data/mosques.json`
2. Create `public/data/mosques/[slug]/` and add monthly JSON files (january.json … december.json)
3. Optionally add `ramadan.json` for Ramadan-specific times

## Scripts

| Command      | Description              |
|-------------|--------------------------|
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build         |
| `npm start`     | Start production server  |
| `npm run lint`  | Run ESLint               |

## Deployment

Build and deploy to Vercel, Netlify, or any platform that supports Next.js:

```bash
npm run build
npm start
```

## License

MIT
