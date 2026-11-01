# Data source

The mosques in this city are fed by the **Batley Salaah Times** iOS app's public API,
not by each mosque's own website.

Website: https://batleysalaahtimes.com

## Endpoint

```
GET https://batleysalaahtimes.com/api/mosques.php
GET https://batleysalaahtimes.com/api/monthly-timetable.php?mosque_id={id}&month=YYYY-MM
```

`mosques.php` returns `{"data": [{"id": 24, "name": "Jame Masjid", …}]}`.
The monthly response carries `monthly_schedule`, keyed `YYYY-MM-DD`, each value a list
of `{prayer_name, start_time, jamaat_time}` rows for Fajr, Sunrise, Dhuhr, Asr,
Maghrib and Isha. Times are 24-hour `HH:MM:SS`; `jamaat_time` can be `null`.

Mapping to the repo monthly format:

| Repo field | Source field |
|------------|--------------|
| `prayer_times[]` | `start_time` for each `prayer_name` (`Sunrise` → `shurooq`) |
| `iqamah_times[]` | `jamaat_time`, falling back to `start_time` |
| `iqamah_times[].jummah` | Friday `Dhuhr` `jamaat_time` |

## Traps

- **Rolling window only.** Months outside the current and next month come back as
  `"monthly_schedule": {}` with `"status": "success"`. Historical months cannot be
  backfilled from this feed — July–September were already empty when checked on
  2026-11-01 — which is why this city carries a partial year.
- **Cross-listed Dewsbury mosques.** The feed also lists *Masjid Quba* (`id=40`,
  Thornhill) and *Madressah Al Hira* (`id=32`), both of which are Dewsbury mosques.
  Masjid Quba is published by both feeds with slightly different jamat times, so the
  Dewsbury feed wins and the extractor skips the Batley copy. Madressah Al Hira appears
  only in this feed, so it is written to `dewsbury/madressah-al-hira`.
- **Blank jamat cells.** A `null` `jamaat_time` means the feed has no value for that
  day. Al-Ihsan Trust leaves Friday Dhuhr null (Jumu'ah only, stored as `"-"`), so the
  extractor keeps the existing repo value rather than inventing one.

## Rebuild

```
python3 scripts/extract-salaah-times-apps.py --year 2026 --months 10,11 \
    --skip-dewsbury --skip-scunthorpe
python3 scripts/verify-salaah-times-apps.py --months 10,11
```

`scripts/extract-salaah-times-apps.py` writes `january.json`–`december.json` here;
`scripts/verify-salaah-times-apps.py` compares every written month against the live
feed and exits non-zero on a mismatch.
