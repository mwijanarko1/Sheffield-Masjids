# Data source

Prayer times for **Muslim Welfare House Sheffield** (`sheffield/muslim-welfare-house`) are published in the mosque’s Google Sheet **MWHS Prayer Timetable**:

https://docs.google.com/spreadsheets/d/1Bb4x6ilumnvlmZSvpg6s1i3AQ1rNkWyrib3BQ2n3-M4/edit

Website: https://www.mwhs.org.uk

## Full year tab (preferred for month rebuilds)

| Tab | gid | Notes |
|-----|-----|-------|
| TimeTable | `0` | Daily rows for 2024–2026 with entry + iqamah + jummah. UK DST is encoded on the correct Sundays (e.g. 2026-10-25). Some summer Isha iqamah cells are the literal text `Entry Time` (= use Isha entry). |

```
https://docs.google.com/spreadsheets/d/1Bb4x6ilumnvlmZSvpg6s1i3AQ1rNkWyrib3BQ2n3-M4/export?format=csv&gid=0
```

## Live daily tabs (verify / scrape)

These tabs expose **today’s** times (not a full month). Prefer CSV export:

```
https://docs.google.com/spreadsheets/d/1Bb4x6ilumnvlmZSvpg6s1i3AQ1rNkWyrib3BQ2n3-M4/export?format=csv&gid={GID}
```

| Tab | gid | CSV shape |
|-----|-----|-----------|
| Entry & Iqamah | `1913640521` | Header `Entry,Prayer,Iqamah` then Fajr/Dhuhr/Asr/Maghrib/Isha rows |
| Shurooq & Jummah | `356759171` | Header `Shurooq,Jummah` then one data row |
| Entry Times | `1620370804` | Five adhan times (Fajr→Isha), no header |
| Iqamah Times | `505427047` | Five iqamah times (Fajr→Isha), no header |
| Shurooq | `1368650003` | Label + sunrise |
| Jummah | `1948386050` | Label + Friday dhuhr iqamah |

Maghrib iqamah matches Maghrib entry when there is no delay.

## Monthly JSON in this repo

Full-year `january.json`–`december.json` (and `ramadan.json`) remain the seeded source for Masjidly / Convex. Rebuild months from TimeTable (`gid=0`) when possible; use the live daily tabs to cross-check “today”. Do not invent or astronomically calculate times.
