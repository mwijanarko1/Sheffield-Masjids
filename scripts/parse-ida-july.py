import json
import re

USER_JSON = {
  "month": "JULY 2026",
  "prayer_times": [
    { "date": 1, "fajr": "01:16", "shurooq": "04:45", "dhuhr": "13:13", "asr": "18:48", "maghrib": "21:34", "isha": "22:34" },
    { "date": 2, "fajr": "01:16", "shurooq": "04:46", "dhuhr": "13:14", "asr": "18:47", "maghrib": "21:34", "isha": "22:34" },
    { "date": 3, "fajr": "01:16", "shurooq": "04:47", "dhuhr": "13:14", "asr": "18:47", "maghrib": "21:33", "isha": "22:33" },
    { "date": 4, "fajr": "01:16", "shurooq": "04:48", "dhuhr": "13:14", "asr": "18:47", "maghrib": "21:33", "isha": "22:33" },
    { "date": 5, "fajr": "01:16", "shurooq": "04:48", "dhuhr": "13:14", "asr": "18:47", "maghrib": "21:32", "isha": "22:32" },
    { "date": 6, "fajr": "01:16", "shurooq": "04:49", "dhuhr": "13:14", "asr": "18:47", "maghrib": "21:32", "isha": "22:32" },
    { "date": 7, "fajr": "01:16", "shurooq": "04:50", "dhuhr": "13:15", "asr": "18:46", "maghrib": "21:31", "isha": "22:31" },
    { "date": 8, "fajr": "01:16", "shurooq": "04:51", "dhuhr": "13:15", "asr": "18:46", "maghrib": "21:30", "isha": "22:30" },
    { "date": 9, "fajr": "01:16", "shurooq": "04:52", "dhuhr": "13:15", "asr": "18:46", "maghrib": "21:30", "isha": "22:30" },
    { "date": 10, "fajr": "01:16", "shurooq": "04:53", "dhuhr": "13:15", "asr": "18:45", "maghrib": "21:29", "isha": "22:30" },
    { "date": 11, "fajr": "01:16", "shurooq": "04:54", "dhuhr": "13:15", "asr": "18:45", "maghrib": "21:28", "isha": "22:29" },
    { "date": 12, "fajr": "01:16", "shurooq": "04:56", "dhuhr": "13:15", "asr": "18:45", "maghrib": "21:27", "isha": "22:28" },
    { "date": 13, "fajr": "01:16", "shurooq": "04:57", "dhuhr": "13:15", "asr": "18:44", "maghrib": "21:26", "isha": "22:28" },
    { "date": 14, "fajr": "01:16", "shurooq": "04:58", "dhuhr": "13:15", "asr": "18:44", "maghrib": "21:25", "isha": "22:27" },
    { "date": 15, "fajr": "01:16", "shurooq": "04:59", "dhuhr": "13:16", "asr": "18:43", "maghrib": "21:24", "isha": "22:26" },
    { "date": 16, "fajr": "01:16", "shurooq": "05:01", "dhuhr": "13:16", "asr": "18:43", "maghrib": "21:23", "isha": "22:26" },
    { "date": 17, "fajr": "01:16", "shurooq": "05:02", "dhuhr": "13:16", "asr": "18:42", "maghrib": "21:22", "isha": "22:25" },
    { "date": 18, "fajr": "01:16", "shurooq": "05:03", "dhuhr": "13:16", "asr": "18:41", "maghrib": "21:21", "isha": "22:24" },
    { "date": 19, "fajr": "01:16", "shurooq": "05:04", "dhuhr": "13:16", "asr": "18:41", "maghrib": "21:19", "isha": "22:23" },
    { "date": 20, "fajr": "01:16", "shurooq": "05:06", "dhuhr": "13:16", "asr": "18:40", "maghrib": "21:18", "isha": "22:22" },
    { "date": 21, "fajr": "01:16", "shurooq": "05:07", "dhuhr": "13:16", "asr": "18:39", "maghrib": "21:17", "isha": "22:21" },
    { "date": 22, "fajr": "01:16", "shurooq": "05:09", "dhuhr": "13:16", "asr": "18:39", "maghrib": "21:16", "isha": "22:21" },
    { "date": 23, "fajr": "01:16", "shurooq": "05:10", "dhuhr": "13:16", "asr": "18:38", "maghrib": "21:14", "isha": "22:19" },
    { "date": 24, "fajr": "01:16", "shurooq": "05:12", "dhuhr": "13:16", "asr": "18:37", "maghrib": "21:13", "isha": "22:19" },
    { "date": 25, "fajr": "01:16", "shurooq": "05:13", "dhuhr": "13:16", "asr": "18:36", "maghrib": "21:11", "isha": "22:17" },
    { "date": 26, "fajr": "01:16", "shurooq": "05:14", "dhuhr": "13:16", "asr": "18:35", "maghrib": "21:10", "isha": "22:16" },
    { "date": 27, "fajr": "01:30", "shurooq": "05:16", "dhuhr": "13:16", "asr": "18:35", "maghrib": "21:08", "isha": "22:15" },
    { "date": 28, "fajr": "01:44", "shurooq": "05:18", "dhuhr": "13:16", "asr": "18:34", "maghrib": "21:07", "isha": "22:14" },
    { "date": 29, "fajr": "01:53", "shurooq": "05:19", "dhuhr": "13:16", "asr": "18:33", "maghrib": "21:05", "isha": "22:13" },
    { "date": 30, "fajr": "02:01", "shurooq": "05:21", "dhuhr": "13:16", "asr": "18:32", "maghrib": "21:03", "isha": "22:11" },
    { "date": 31, "fajr": "02:08", "shurooq": "05:22", "dhuhr": "13:16", "asr": "18:31", "maghrib": "21:02", "isha": "22:11" }
  ],
  "iqamah_times": [
    {"date_range": "1-2", "fajr": "04:15", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:50"},
    {"date_range": "3", "fajr": "04:20", "dhuhr": "13:25", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:50"},
    {"date_range": "4-9", "fajr": "01:30", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:50"},
    {"date_range": "10", "fajr": "04:30", "dhuhr": "13:25", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:45"},
    {"date_range": "11-12", "fajr": "01:30", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:45"},
    {"date_range": "13-16", "fajr": "04:30", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:45"},
    {"date_range": "17", "fajr": "04:35", "dhuhr": "13:25", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:40"},
    {"date_range": "18-19", "fajr": "01:30", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:40"},
    {"date_range": "20-23", "fajr": "04:35", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:40"},
    {"date_range": "24", "fajr": "04:45", "dhuhr": "13:25", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:30"},
    {"date_range": "25-26", "fajr": "01:30", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:30"},
    {"date_range": "27-30", "fajr": "04:45", "dhuhr": "13:55", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:30"},
    {"date_range": "31", "fajr": "04:55", "dhuhr": "13:25", "asr": "19:40", "maghrib": "Adhan+0", "isha": "22:20"}
  ],
  "jummah_iqamah": ["13:25", "14:50", "15:15"]
}


def parse_pdf_text(path):
    with open(path) as f:
        text = f.read()
    rows = []
    # Match lines like: Wed       01 Jul     1:16     4:45      1:13     6:48    10:34      4:15      1:55     7:40         9:34        10:50
    pattern = re.compile(
        r"([A-Za-z]{3})\s+(\d{2})\s+Jul\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})"
    )
    for m in pattern.finditer(text):
        (day, date, fajr_b, sunrise, dhuhr_b, asr_b, isha_b,
         fajr_j, dhuhr_j, asr_j, maghrib_j, isha_j) = m.groups()
        date = int(date)
        def pm(t):
            h, mm = map(int, t.split(":"))
            if h < 12:
                h += 12
            return f"{h:02d}:{mm:02d}"
        def am(t):
            h, mm = map(int, t.split(":"))
            return f"{h:02d}:{mm:02d}"
        rows.append({
            "date": date,
            "fajr": am(fajr_b),
            "shurooq": am(sunrise),
            "dhuhr": pm(dhuhr_b),
            "asr": pm(asr_b),
            "maghrib": pm(maghrib_j),
            "isha": pm(isha_b),
            "iqamah": {
                "fajr": am(fajr_j),
                "dhuhr": pm(dhuhr_j),
                "asr": pm(asr_j),
                "maghrib": pm(maghrib_j),
                "isha": pm(isha_j),
            }
        })
    return rows


def compare(rows):
    by_date = {r["date"]: r for r in rows}
    user_by_date = {r["date"]: r for r in USER_JSON["prayer_times"]}
    diffs = []
    for d in range(1, 32):
        pdf = by_date.get(d)
        user = user_by_date.get(d)
        if not pdf or not user:
            continue
        for key in ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"]:
            if pdf[key] != user[key]:
                diffs.append(f"Day {d} {key}: PDF={pdf[key]} USER={user[key]}")
    return diffs


if __name__ == "__main__":
    rows = parse_pdf_text("/tmp/ida_jul26.txt")
    print(f"Parsed {len(rows)} days from PDF")
    print("PDF day 1:", rows[0])
    print("User day 1:", USER_JSON["prayer_times"][0])
    diffs = compare(rows)
    if diffs:
        print("\nDifferences:")
        for d in diffs:
            print(" ", d)
    else:
        print("\nAll adhan times match!")
    print("\nPDF iqamah day 1:", rows[0]["iqamah"])
    print("User jummah:", USER_JSON["jummah_iqamah"])
