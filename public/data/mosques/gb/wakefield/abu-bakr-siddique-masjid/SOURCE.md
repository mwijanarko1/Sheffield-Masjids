# Abu Bakr Siddique Masjid (Wakefield)

- **Address:** Unit A, Tadman Street, Wakefield WF1 5QU, United Kingdom
- **Website:** https://abu-bakr.yolasite.com/
- **Prayer times page:** https://abu-bakr.yolasite.com/Prayer-Times.php
- **Maps:** https://maps.app.goo.gl/wDV69Y7DGte5KJFi8
- **Charity Commission:** 1185786
- **Phone:** 07706563039

## Data source

Monthly timetable image published on the Yola site:

- https://abu-bakr.yolasite.com/resources/Nov26.jpeg.opt1107x1371o0,0s1107x1371.jpeg
- Title on image: **NOVEMBER 2026**

Columns: Day, Date, Fajr Begin/Jamat, Sunrise, Zuhr Begin/Jamat, Asr Begin/Jamat, Maghrib Adhan & Jamat, Isha Begin/Jamat, Islamic date.

- Maghrib jamat = Maghrib adhan (single column).
- Jamat values are printed on blue rows (Sunday 1 and subsequent Fridays) and carried forward until the next printed change.
- Fajr jamat steps: 06:00 (1–5) → 06:15 (6–12) → 06:30 (13–19) → 06:45 (20–30).
- Asr jamat steps: 14:30 (1–12) → 14:15 (13–26) → 14:00 (27–30).
- Zuhr/Jummah jamat: 12:30 throughout; `jummah_iqamah` = `12:30`.
- Isha jamat: 19:00 throughout.
- Afternoon times on the sheet are 12-hour style without AM/PM (`01:xx`–`04:xx` Asr/Maghrib, `05:xx`–`06:xx` Isha begin); converted to 24-hour for JSON.

## Coverage

- **November 2026** only (image `Nov26.jpeg`). No other month images found on the site at extraction time.
- Partial year is intentional; `isHidden: false` because published days are verified from the mosque image.

## Notes

- Site is behind Cloudflare; fetch the JPEG via an authenticated browser session when re-extracting.
- Do not use astronomical calculation to fill missing months.
