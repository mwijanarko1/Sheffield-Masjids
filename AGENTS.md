# Sheffield Masjids — Agent Standards

## Overview

This project stores structured prayer times (adhan + iqamah) for UK mosques and seeds them to a Convex database (dev + prod). This document defines the exact procedure for adding or modifying mosque prayer time data.

---

## 1. Data Directory Structure

All mosque data lives under:

```
public/data/mosques/gb/{citySlug}/{mosque-id}/
```

Where:
- `{citySlug}` — lowercase, hyphenated city name (e.g. `manchester`, `london`, `blackpool`)
- `{mosque-id}` — lowercase, hyphenated mosque identifier (e.g. `didsbury-mosque`, `east-london-mosque`)

Example files:
```
public/data/mosques/gb/manchester/didsbury-mosque/january.json
public/data/mosques/gb/manchester/didsbury-mosque/february.json
...
public/data/mosques/gb/london/east-london-mosque/january.json
```

---

## 2. Monthly JSON Format

Each month file (e.g. `january.json`) has this exact structure:

```json
{
  "month": "JANUARY",
  "prayer_times": [
    {
      "date": 1,
      "fajr": "06:30",
      "shurooq": "08:15",
      "dhuhr": "12:08",
      "asr": "13:48",
      "maghrib": "16:02",
      "isha": "17:50"
    }
  ],
  "iqamah_times": [
    {
      "date_range": "1",
      "fajr": "07:00",
      "dhuhr": "12:30",
      "asr": "14:15",
      "maghrib": "16:02",
      "isha": "18:15"
    }
  ],
  "jummah_iqamah": "12:30"
}
```

### Prayer times rules:
- `date` — integer day of month (1–31)
- All times in **24-hour format** (`HH:MM`)
- Fields: `fajr`, `shurooq` (sunrise), `dhuhr`, `asr`, `maghrib`, `isha`

### Iqamah times rules:
- `date_range` — either `"1"` (single day) or `"1-7"` (range of days with same iqamah)
- **Most mosques use one entry per day** (`"date_range": "1"`), but weekly ranges are also supported
- If maghrib iqamah = maghrib adhan (no delay), use the same time value
- If isha iqamah = isha adhan (table per day, not weekly), use the same time value per day
- If iqamah is given as weekly blocks (e.g. Fajr changes weekly), **expand into individual daily entries**

### Jumu'ah:
- `jummah_iqamah` — the Friday dhuhr iqamah time in 24h format (e.g. `"13:30"`, `"12:20"`)

---

## 3. `mosques.json` Registry

Each mosque must have an entry in `/public/data/mosques.json`:

```json
{
  "id": "didsbury-mosque",
  "name": "Didsbury Mosque",
  "address": "271 Burton Rd, Manchester M20 2WA, United Kingdom",
  "lat": 53.4172,
  "lng": -2.2316,
  "slug": "didsbury-mosque",
  "citySlug": "manchester",
  "cityName": "Manchester",
  "countryCode": "GB",
  "countryName": "United Kingdom",
  "isHidden": false,
  "website": "https://didsburymosque.org"
}
```

- `id` — must match the directory name (`{mosque-id}`)
- `slug` — same as `id`
- `citySlug` — must match parent directory name
- `isHidden` — set to `true` for data that is placeholder, incomplete, or unverifiable; `false` for fully verified

---

## 4. Data Source Rules (Allowed vs Banned)

### ✅ Allowed sources:
- JSON APIs and REST endpoints
- CSV exports (e.g. Google Sheets published CSVs)
- HTML tables from rendered DOM (scraping)
- PDFs with extractable text tables (via `pdftotext -layout`)
- Data manually provided by the user (typed from timetables, PDFs, images)

### ✅ Allowed extraction methods:
- `curl` / `fetch` to download structured data
- Python to parse JSON, CSV, or HTML tables
- `pdftotext -layout` for text-based PDFs
- Direct text parsing from user-provided raw data
- **OCR (tesseract)** on images — only when explicitly permitted by the user

Load `extract-mosque-prayer-times` before HTTP extraction. Known traps: Newham/Humera Sheets (`2PACX` + `gid`, separate jamat vs `salahBeginning`, 12h +12), Witton DPT (HTTP not HTTPS, GET not POST, thead-only means no month data), Brand Lane (single-day embed, stop and request PDF), HTML tables with `Sep 1, 2026` date cells and nested iqamah spans. Write Python files instead of quoted one-liners. `scripts/seed-convex.ts` maps month names with `Array.from(MONTH_FILES.entries())`.

### ❌ Banned:
- **Astronomical calculations** — never compute/calculate prayer times using libraries, formulas, or algorithms
- **Placeholder/extrapolated data** without marking `isHidden: true`

---

## 5. Verification Rules

1. **Always cross-verify** — The default "Daily Prayer Time for Mosques" WordPress plugin AJAX endpoint (`get_monthly_timetable`) may return auto-calculated data that differs from the mosque's actual published timetable.
2. **Check for custom endpoints** — Some mosques have custom AJAX actions or download parameters (e.g. `mcm_get_month_file`, `?ptp_download=2026-{MM}`).
3. **MasjidBox widget** — Only exposes 7 days of data via `window.REDUX_STATE`. Not sufficient for full year.
4. **DST clock changes** — UK clocks spring forward (late March) and fall back (late October). Times shift accordingly. Verify the transition days are correct.
5. **Summer solstice** — Some mosques use `00:00` for Fajr iqamah during shortest nights (Jun 22–25). Preserve as-is from source.

---

## 6. Seeding to Convex

After adding/modifying data, seed both databases:

```bash
# Preferred: target specific mosques by slug (works after committing, no full re-seed)
npx tsx scripts/seed-convex.ts --slug al-huda-preston,al-ansaar-preston
npx tsx scripts/seed-convex.ts --slug al-huda-preston,al-ansaar-preston --prod

# Incremental: only files changed vs HEAD (use before committing, not after)
npx tsx scripts/seed-convex.ts --changed
npx tsx scripts/seed-convex.ts --changed --prod

# Full re-seed (all mosques, all months, slow, avoid unless necessary)
npx tsx scripts/seed-convex.ts
npx tsx scripts/seed-convex.ts --prod
```

- `--slug <ids>`: seed only the named mosque(s), comma-separated. Use this after committing fixes.
- `--changed`: seeds only files that differ from HEAD. Use before committing, not after.
- Omit both flags for a full re-seed (all 290 mosques x 12 months, takes ~10 min).
- **Dev**: `upbeat-goat-583.eu-west-1.convex.cloud`, forces `isHidden: false`
- **Prod**: `zany-mockingbird-207.eu-west-1.convex.cloud`, respects file values

### Agent npm/npx allowlist (seed only)

Default: do **not** run `npm` / `npx` (tell the user to run it), except when the user asks to seed.

**Allowed** (exact family only — no other npm/npx):

| Command | Notes |
|---------|--------|
| `npx tsx scripts/seed-convex.ts` … | Optional flags: `--changed`, `--prod`, `--slug <ids>` |
| `npm run seed:dev` … | Optional `-- --changed`, `-- --slug <ids>` |
| `npm run seed:prod` … | Optional `-- --changed`, `-- --slug <ids>` |

**Not allowed:** any other `npm`/`npx` (`install`, `build`, `convex …`, random packages, etc.). Still require `/build` (or an explicit ask) for those.

---

## 7. Common Patterns (Reference)

### Mosque lookup / data extraction checklist:
1. Visit the mosque website — look for "Prayer Times" page
2. Check for API/JSON endpoints (look in Network tab, page source, or JS files)
3. Check for Google Sheets published CSV (Newham Mosques pattern)
4. Check for PDF download links or custom WordPress plugin endpoints
5. Check for MasjidBox widget (7 days only — insufficient)
6. If Cloudflare blocks access, ask user to provide data manually

### Known endpoints by mosque:
| Mosque | Endpoint | Type |
|--------|----------|------|
| East London Mosque | `https://www.eastlondonmosque.org.uk/prayer-times` | HTML scrape |
| Didsbury Mosque | `?ptp_download=2026-{MM}` | PDF |
| Manchester Central | `admin-ajax.php?action=mcm_get_month_file&month={MM}&year=2026` | JSON |
| Cheadle Masjid | Cloudflare blocked — manual data from user | Table text |
| Al Furqan | Framer site — image timetable (OCR if permitted) | Image |
| Newham Mosques | Google Sheets published CSV | CSV |
| Croydon ICT | REST API JSON | JSON |
| Masjid Faizul Islam (Birmingham) | Facebook posts (timetable images/PDFs) — website `faizulislam.co.uk` is down/unusable | Facebook / manual from user |

---

## 8. Full Workflow (New Mosque)

1. **Find data source** — locate prayer times on mosque website
2. **Extract** — download/parse using allowed methods
3. **Create directory** — `public/data/mosques/gb/{citySlug}/{mosque-id}/`
4. **Create 12 JSON files** — `january.json` through `december.json`
5. **Add to mosques.json** — with correct lat/lng, address, `isHidden` flag
6. **Seed dev** — `npx tsx scripts/seed-convex.ts --changed`
7. **Seed prod** — `npx tsx scripts/seed-convex.ts --changed --prod`

---

## 9. Important Conventions

- Time format: **always 24h** (`HH:MM`). Convert from 12h on input (PM → +12, 12AM → 00).
- Month names: **uppercase** in JSON (`"JANUARY"`, `"FEBRUARY"`, etc.)
- City slugs use `gb/` prefix (country code ISO 3166-1 alpha-2)
- Always seed **both** dev and prod after any change
- Use `--changed` for incremental seeding when possible
