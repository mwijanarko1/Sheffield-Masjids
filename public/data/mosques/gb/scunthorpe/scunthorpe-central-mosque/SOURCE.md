# Data source

Prayer times for **Scunthorpe Central Mosque** (`scunthorpe/scunthorpe-central-mosque`) are
published by the mosque's own PrayDisplay screen and mirrored in the
**Scunthorpe Central Mosque** iOS app (`com.orderpal.scm`, Flutter, App Group
`group.homeScreenscm`).

Website: https://www.scunthorpemosque.co.uk

## Endpoint (preferred)

The public display at https://time.scunthorpemosque.co.uk is a PrayDisplay
screen registered under the code `SCM`. It exposes a full month of adhan +
iqamah, no auth:

```
https://time.scunthorpemosque.co.uk/api/display/SCM/monthly?month={M}&year={Y}
```

```json
{
  "mosque": "Scunthorpe Central Mosque",
  "month": 11,
  "year": 2026,
  "times": [
    {
      "date": "2026-11-01",
      "day": 1,
      "weekday": "Sun",
      "fajrStart": "05:24",
      "fajrIqamah": "06:30",
      "sunrise": "07:02",
      "dhuhrStart": "11:51",
      "dhuhrIqamah": "13:00",
      "asrStart": "14:39",
      "asrIqamah": "15:00",
      "maghribStart": "16:35",
      "maghribIqamah": "16:35",
      "ishaStart": "17:55",
      "ishaIqamah": "18:45",
      "jummahTime": "11:51"
    }
  ]
}
```

Mapping to the repo monthly format:

| Repo field | Source field |
|------------|--------------|
| `prayer_times[].fajr` | `fajrStart` |
| `prayer_times[].shurooq` | `sunrise` |
| `prayer_times[].dhuhr` | `dhuhrStart` |
| `prayer_times[].asr` | `asrStart` |
| `prayer_times[].maghrib` | `maghribStart` |
| `prayer_times[].isha` | `ishaStart` |
| `iqamah_times[].*` | `*Iqamah` |

### Traps

- **`jummahTime` is the Friday Dhuhr adhan, not the iqamah.** Do not write it to
  `jummah_iqamah`; use that day's `dhuhrIqamah` (currently `13:00`).
- `?month=` is 1–12 and `?year=` is required; a bare `?month=11` also works but
  defaults to the current year.
- The endpoint returns HTTP 200 with `times: []` for years/ months the mosque has
  not published yet (2027+ was empty when checked), so treat an empty array as
  "not published", not as an error.
- `/api/display/SCM` (no `/monthly`) returns only today + tomorrow plus display
  settings, so it is not sufficient for a month.

## Related: the app's private API

The iOS app itself posts to `https://scmm.scunthorpecentral.com/api/today-prayer-time`
with a required `type` field (`{"type": ...}`); the field is validated with a
Laravel `in:` rule whose accepted values are only known to the app, and the
endpoint returns a single day. `/api/display/SCM/monthly` above is the same
timetable in bulk, so the extraction script uses it instead.

## Rebuild

```
python3 scripts/extract-salaah-times-apps.py --year 2026 --months 11 --skip-batley --skip-dewsbury
```

`scripts/extract-salaah-times-apps.py` writes `january.json`–`december.json` here.
Verified against the app's own App Group cache for 2026-10-11 and against the
committed November file (days 1–7 identical; the endpoint also supplies the
later days the app only caches a week ahead).

## Monthly JSON in this repo

The monthly files are the seeded source for Masjidly / Convex. Never invent or
astronomically calculate times; leave a month out when the mosque has not
published it.
