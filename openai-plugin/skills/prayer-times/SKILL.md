---
name: prayer-times
description: Look up published mosque adhan and iqamah times from Sheffield Masjids.
---

# Prayer times

Use the Sheffield Masjids MCP tools for mosque prayer times.

1. If the user did not give a mosque slug, call `search_mosques` with their mosque or city name.
2. If more than one mosque matches, ask which one they follow before quoting iqamah.
3. Call `get_prayer_times` with the mosque slug and optional `YYYY-MM-DD` date.
4. Always report **adhan** and **iqamah** as separate values, and include the returned date and timezone.
5. If `iqamah` is `null`, the mosque has published adhan times only for that day: report the adhan times and say iqamah is not published.
6. Do not invent times, scrape pages, or present one mosque's iqamah as a city-wide time.
