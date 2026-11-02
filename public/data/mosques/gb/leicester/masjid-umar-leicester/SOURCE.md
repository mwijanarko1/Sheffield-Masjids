# Data source

Masjid Umar (`leicester/masjid-umar-leicester`), 1-3 Evington Drive, Leicester LE5 5PF.

- November 2026 PDF timetable: `https://masjid-umar.org/wp-content/uploads/2026/09/November-2026.pdf` (header "MASJID UMAR 1-3 EVINGTON DRIVE LEICESTER LE5 5PF … NOVEMBER 2026"). Linked from `https://masjid-umar.org/masjid/prayer-times/`.
- Read visually. Times are 12h; Fajr and Sunrise are morning times, the rest are afternoon or evening.
- Start times: Subh Sadiq → `fajr`, Sunrise → `shurooq`, Noon Zawal → `dhuhr`, Asr → `asr`, Esha → `isha`.
- Jamaat times: Fajr, Zuhr, Asr, Maghrib and Esha → `iqamah_times`.
- **Maghrib start = Maghrib jamaat.** The PDF only gives a Maghrib jamaat time. By owner decision (2 Nov 2026), `prayer_times[].maghrib` is set to that jamaat time, and the iqamah row keeps the same value. This follows the dominant repo convention, where the Maghrib start and the Maghrib iqamah hold the same `HH:MM` value. Omitting the iqamah key is the alternative, but the API then shows `-` for the Maghrib jamaat.
- Jumu'ah: the table's Friday Zuhr jamaat is 1:00 pm; the footer says "JUMUAH BAYAN 12:15, ADHAN 12:50, KHUTBAH 1:00 p.m." → `jummah` = `13:00`.
- Address: the PDF header and OpenStreetMap say 1-3 Evington Drive; the website footer says 5-7 Evington Drive.
