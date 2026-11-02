# Data source

Al-Ihsaan Academy (`ilford/al-ihsaan-academy`), 785 High Rd, London IG3 8RW.

- Monthly JSON from the site's "prayer-timetable" WordPress plugin: `https://www.al-ihsaan.org/wp-json/ptt/v1/month/{YYYY}/{M}`. Each day has `times` (begins) and `jamaah`, with `source: "custom"` (entered by the mosque).
- This matches the homepage "Salat Timetable" and today's widget (`/wp-json/ptt/v1/day/{YYYY-MM-DD}`).
- The site's Daily Prayer Time plugin (`admin-ajax.php?action=get_monthly_timetable`) returns only `12:00 am` placeholders. Do not use it.
- Jumu'ah (from the site): winter Bayan 12:30pm and Khutbah/Salah 1:00pm; summer 1:00pm and 1:30pm. In the JSON, the Friday `jamaah.dhuhr` is the Jumu'ah time.
