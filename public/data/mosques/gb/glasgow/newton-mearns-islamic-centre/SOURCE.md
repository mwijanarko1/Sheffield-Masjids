# Data source

Newton Mearns Islamic Centre (`glasgow/newton-mearns-islamic-centre`), 8 Langrig Road, Newton Mearns, Glasgow G77 5AA.

- Full-year CSV behind the site's Prayer Times page: `https://nmic.co.uk/wp-content/uploads/2026/06/2026.csv`.
- Columns: YEAR, MONTH, Date, DAY, Fajr start/Jamat, Sunrise, Zuhr start/Jamat, Asr 1 start, Asr 2 start, Asr Jamat, Maghrib start/Jamat, Isha start/Jamat.
- Times are 12h without AM/PM. Fajr and Sunrise are morning times. Zuhr start (12:xx) is kept as is. Zuhr Jamat, Asr, Maghrib and Isha get +12.
- `asr` = Asr 1 start; `asr_mithl2` = Asr 2 start.
- Jumu'ah (homepage): first jamat 12:40 PM, second jamat 1:30 PM.
