#!/usr/bin/env python3
"""Extract Diyanet Center of America 2026 prayer times from published JSON."""
import datetime
import json
import urllib.request
from collections import defaultdict
from pathlib import Path

JSON_URL = (
    "https://diyanetamerica.org/wp-content/uploads/2026/09/"
    "prayer-times-updated-on-7-march-1-1-2-1-1-3.json"
)
OUT_DIR = Path("public/data/mosques/us/lanham/diyanet-center-of-america")

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def excel_to_date(serial: int) -> datetime.date:
    return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(serial))


def frac_to_hhmm(value: float) -> str:
    total_minutes = int(round(float(value) * 24 * 60))
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def fetch_rows() -> list[dict]:
    request = urllib.request.Request(
        JSON_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)"},
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def main() -> None:
    rows = fetch_rows()
    by_month: dict[int, list[dict]] = defaultdict(list)

    for row in rows:
        day = excel_to_date(row["DATE"])
        if day.year != 2026:
            continue
        by_month[day.month].append({
            "date": day.day,
            "weekday": day.strftime("%A"),
            "fajr": frac_to_hhmm(row["FAJR"]),
            "fajr_iq": frac_to_hhmm(row["FAJR IQAMAH"]),
            "shurooq": frac_to_hhmm(row["SUNRISE"]),
            "dhuhr": frac_to_hhmm(row["DHUHR"]),
            "dhuhr_iq": frac_to_hhmm(row["DHUHR IQAMAH"]),
            "asr": frac_to_hhmm(row["ASR"]),
            "asr_iq": frac_to_hhmm(row["ASR IQAMAH"]),
            "maghrib": frac_to_hhmm(row["MAGHRIB"]),
            "maghrib_iq": frac_to_hhmm(row["MAGHRIB IQAMAH"]),
            "isha": frac_to_hhmm(row["ISHA"]),
            "isha_iq": frac_to_hhmm(row["ISHA IQAMAH"]),
        })

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for month_num in range(1, 13):
        days = sorted(by_month.get(month_num, []), key=lambda item: item["date"])
        if not days:
            print(f"SKIP {MONTH_NAMES[month_num - 1]}: no rows")
            continue

        prayer_times = [{
            "date": day["date"],
            "fajr": day["fajr"],
            "shurooq": day["shurooq"],
            "dhuhr": day["dhuhr"],
            "asr": day["asr"],
            "maghrib": day["maghrib"],
            "isha": day["isha"],
        } for day in days]

        iqamah_times = [{
            "date_range": str(day["date"]),
            "fajr": day["fajr_iq"],
            "dhuhr": day["dhuhr_iq"],
            "asr": day["asr_iq"],
            "maghrib": day["maghrib_iq"],
            "isha": day["isha_iq"],
        } for day in days]

        friday = next((day for day in days if day["weekday"] == "Friday"), None)
        jummah = friday["dhuhr_iq"] if friday else days[0]["dhuhr_iq"]

        output = {
            "month": MONTH_NAMES[month_num - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        }
        out_path = OUT_DIR / f"{MONTH_FILES[month_num - 1]}.json"
        out_path.write_text(json.dumps(output, indent=2) + "\n")
        print(f"Wrote {out_path} ({len(days)} days, jummah {jummah})")


if __name__ == "__main__":
    main()
