# Data source

Somers Town Mosque (`london/somers-town-mosque`), 68 Churchway, London NW1 1LT. Source page: `https://www.somerstownmosque.com/prayer-times/`.

- Monthly 2026 timetable posters (each titled "<MONTH> 2026"):
  - `https://www.somerstownmosque.com/wp-content/uploads/2025/12/Somers-Town-Mosque-<Month>_2026.jpg` for Jan, Feb, March, April, May, June, July, August, Sep, Oct and Dec.
  - November: `https://www.somerstownmosque.com/wp-content/uploads/2026/10/Somers_page-0011-1.jpg`.
- Full-year PDF used to cross-check every month: `https://www.somerstownmosque.com/wp-content/uploads/2026/10/Somers_Town_Mosque-Timetable_26.pdf`.
- The posters say they are "Based on: London Unified Prayer Timetable".
- Columns: Fajr Begins/Jama'ah, Sunrise, Zuhr Begins/Jama'ah, Asr 1 Mithl, 2 Mithl, Jama'ah, Maghrib Begins/Jama'ah, Isha Begins/Jama'ah.
- `asr` = 1 Mithl (majority opinion); `asr_mithl2` = 2 Mithl (Hanafi).
- Times are 12h. Fajr and Sunrise are morning times. Zuhr begins 11:xx/12:xx is kept as is, and 1:xx becomes 13:xx. Everything else gets +12.
- Friday Zuhr Jama'ah is, per the poster note, "beginning of the khutbah" (12:30 in winter months, 1:20 pm Apr–Sep). It is stored as published in `dhuhr`.
- Jumu'ah (every poster footer): "1st Jama'ah: 12:30 pm | 2nd Jama'ah: 1:10 pm" → `12:30 / 13:10`.
- June: the JPG's "Isha Begins" column is wrong (5:42–6:26 pm, before Maghrib). June Isha start is taken from the full-year PDF (10:27–10:45 pm), which matches the London Unified values.
- October is not included. On the October poster (JPG and PDF alike), the Friday khutbah Zuhr Jama'ah values sit on Saturdays (3, 10, 17, 24 = 1:20; 31 = 12:30), while Fridays show 1:30/1:00. The column looks shifted by a day, so it was left out rather than guessed.
