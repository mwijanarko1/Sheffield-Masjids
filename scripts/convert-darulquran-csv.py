#!/usr/bin/env python3
"""Convert Al Jamia Darul Quran (Bolton) timetable.csv into monthly JSON.

CSV columns: DATE,DAY,ISLAMIC,FAJR_S,FAJR_J,SUNRISE,ZOHR_S,ZOHR_J,ASAR_S,ASAR_J,
MAGHRIB_J,ISHA_S,ISHA_J  (May-Dec 2026 only; no maghrib adhan column published,
so maghrib adhan == maghrib jamaat, per mosque practice.)
"""
import csv
import json
import sys
from pathlib import Path

MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
FILES = [m.lower() for m in MONTHS]

def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "timetable.csv")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)

    months: dict[int, list[dict]] = {i: [] for i in range(1, 13)}
    with src.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row["DATE"].strip()
            y, m, d = date.split("-")
            month = int(m)
            months[month].append({
                "date": int(d),
                "weekday": row["DAY"].strip(),
                "fajr": row["FAJR_S"].strip(),
                "fajr_j": row["FAJR_J"].strip(),
                "shurooq": row["SUNRISE"].strip(),
                "dhuhr": row["ZOHR_S"].strip(),
                "dhuhr_j": row["ZOHR_J"].strip(),
                "asr": row["ASAR_S"].strip(),
                "asr_j": row["ASAR_J"].strip(),
                "maghrib_j": row["MAGHRIB_J"].strip(),
                "isha": row["ISHA_S"].strip(),
                "isha_j": row["ISHA_J"].strip(),
            })

    found = 0
    for month in range(1, 13):
        rows = months[month]
        if not rows:
            continue
        rows.sort(key=lambda r: r["date"])
        prayer_times = [{
            "date": r["date"],
            "fajr": r["fajr"],
            "shurooq": r["shurooq"],
            "dhuhr": r["dhuhr"],
            "asr": r["asr"],
            "maghrib": r["maghrib_j"],
            "isha": r["isha"],
        } for r in rows]
        iqamah_times = [{
            "date_range": str(r["date"]),
            "fajr": r["fajr_j"],
            "dhuhr": r["dhuhr_j"],
            "asr": r["asr_j"],
            "maghrib": r["maghrib_j"],
            "isha": r["isha_j"],
        } for r in rows]
        fri = next((r for r in rows if r["weekday"].lower().startswith("fri")), None)
        jummah = fri["dhuhr_j"] if fri else ""
        data = {
            "month": MONTHS[month - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        }
        (out_dir / f"{FILES[month - 1]}.json").write_text(json.dumps(data, indent=2))
        print(f"  Wrote {FILES[month-1]}.json ({len(prayer_times)} days, jummah {jummah})")
        found += 1

    print(f"\nDone. {found} months written.")


if __name__ == "__main__":
    main()
