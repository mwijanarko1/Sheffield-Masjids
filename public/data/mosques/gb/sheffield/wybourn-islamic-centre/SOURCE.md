# Wybourn Islamic Centre

Official source: <https://wybournislamiccentre.org/>.

## Daily corrections, November 2026

The homepage publishes begins and iqamah for the current day. Read the visible
prayer cards, not a default WordPress timetable. Convert their explicit AM/PM
values to 24-hour time.

| Date | Dhuhr begins | Dhuhr iqamah | Maghrib iqamah | Isha iqamah |
| --- | --- | --- | --- | --- |
| 17 November | 11:51 | 12:45 | 16:15 | 19:15 |
| 18 November | 11:51 | 12:45 | 16:13 | 19:15 |

The 17 November correction was merged in PR #209. The 18 November page was
fetched at 07:04 UTC on that date. Its Fajr, Asr and Maghrib begins also match
the dated 18 November record in the mosque's API.

## Conflicting API values

The official site's `/js/wybourn.2.js` links this dated endpoint:

<https://wic.itbrainsolutions.co.uk/PrayerTimes/GetPrayerTimesByDate?from=18%2F11%2F2026&to=18%2F11%2F2026>

It is a real monthly/yearly feed, but it disagrees with the visible homepage
on Dhuhr, Maghrib and Isha iqamah for both checked days. For 18 November the
API gives 13:00, 16:08 and 18:45; the homepage gives 12:45, 16:13 and 19:15.
Use the published homepage values for the observed day. Do not copy those
iqamah values to unobserved dates or blindly replace the year from this feed.

The homepage does not publish sunrise. Sunrise, all other dates and the
remaining monthly files were not reverified by these daily corrections.
