# Data source

These mosques are fed by the **Dewsbury Salaah Times** iOS app's public API, not by
each mosque's own website.

Website: https://dewsburysalaahtimes.com

## Endpoint

```
GET https://dewsburysalaahtimes.com/management/api/v1/prayers/mosques.php
GET https://dewsburysalaahtimes.com/management/api/v1/prayers/monthly-timetable.php?mosque_id={id}&month=YYYY-MM
```

The response shape matches Batley: `monthly_schedule` keyed `YYYY-MM-DD`, each value a
list of `{prayer_name, start_time, jamaat_time}` rows. Times are 24-hour `HH:MM:SS`.

This feed carries more history than Batley — July–November 2026 were all populated
when checked on 2026-11-01.

## Traps

- **12-hour Dhuhr bug.** Madrasah Al-Amanah publishes Dhuhr `23:55` (an `11:55` that
  had 12 hours added). `normalize_dhuhr` rewrites hours ≥ 20 back to `hours - 12`, and
  `assert_plausible` refuses any month whose Dhuhr falls outside 10:00–15:00. The seed
  guard rejects `23:55` as well, so this must be fixed before writing.
- **Fridays without a Dhuhr row.** Madrasah Islamiyah omits Dhuhr entirely on Fridays
  (five rows instead of six). The repo convention is to carry the previous day's Dhuhr
  adhan and jamat across, and to set `jummah` from that carried jamat.
- **Cross-listed ids.** `Ilahi Masjid`, `Islamic Tarbiyah Academy`, `Masjid Salaam`,
  `Masjid Talha` and `Masjid Uthman` only appear under `id >= 100000`; those are not
  duplicates. `Darul Ilm (Dale Street)` (`id=26`) is a separate campus with no registry
  entry and is skipped.
- **Madressah Al Hira is not in this feed.** It is a Dewsbury mosque but only the
  Batley feed publishes it, so the extractor writes `dewsbury/madressah-al-hira` from
  `batleysalaahtimes.com`.
- **Extra Jumu'ah sittings.** The feed publishes one Friday Dhuhr jamat, but Zakaria
  Masjid has two sittings (`"jummah": "12:15 / 14:00"`). The extractor keeps the
  existing richer value when the feed's time is its prefix.

## Rebuild

```
python3 scripts/extract-salaah-times-apps.py --year 2026 --months 10,11 \
    --skip-batley --skip-scunthorpe
python3 scripts/verify-salaah-times-apps.py --months 10,11
```

`scripts/extract-salaah-times-apps.py` writes `january.json`–`december.json` here;
`scripts/verify-salaah-times-apps.py` compares every written month against the live
feed and exits non-zero on a mismatch.
