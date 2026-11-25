# Wakefield Central Mosque

Source: public Firestore on `wakefield-central-mosque` (https://wakefieldcentralmosque.co.uk/).

- Adhan / sunrise: `artifacts/masjid-connect-app/public/data/prayerCalendar/{DD}-{MM}` (full year available upstream)
- Jamaat (Fajr/Zuhr/Asr/Isha/Jummah): live `.../prayerTimes/today`
- Maghrib jamaat = Maghrib start (site `prayerTimetable.mjs`)

Only months where the live jamaat schedule is consistent with adhan times
(jamaat ≥ adhan for every prayer) are stored: November 19–30 and December 2026.
Refresh when the mosque updates `prayerTimes/today`.
