#!/usr/bin/env python3
"""Extract full-year prayer times from Masjid-E-Hamzah DPT JSON API."""
import json
import urllib.request
from pathlib import Path

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

API = "https://masjidehamzah.co.uk/wp-json/dpt/v1/prayertime?filter=year"
OUT_DIR = Path("public/data/mosques/gb/ashton-under-lyne/masjid-e-hamzah")


def hhmm(value: str) -> str:
    h, m, *_ = value.split(":")
    return f"{int(h):02d}:{m}"


def main() -> None:
    with urllib.request.urlopen(API) as resp:
        payload = json.load(resp)
    rows = payload[0] if isinstance(payload[0], list) else payload

    by_month: dict[int, list] = {m: [] for m in range(1, 13)}
    for row in rows:
        y, m, d = row["d_date"].split("-")
        if y != "2026":
            continue
        by_month[int(m)].append((int(d), row))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for month_num in range(1, 13):
        days = sorted(by_month[month_num], key=lambda x: x[0])
        if not days:
            print(f"SKIP {MONTH_NAMES[month_num - 1]}: no rows")
            continue

        prayer_times = []
        iqamah_times = []
        jummah = ""
        for day_num, row in days:
            prayer_times.append({
                "date": day_num,
                "fajr": hhmm(row["fajr_begins"]),
                "shurooq": hhmm(row["sunrise"]),
                "dhuhr": hhmm(row["zuhr_begins"]),
                "asr": hhmm(row["asr_mithl_1"]),
                "maghrib": hhmm(row["maghrib_begins"]),
                "isha": hhmm(row["isha_begins"]),
            })
            iqamah_times.append({
                "date_range": str(day_num),
                "fajr": hhmm(row["fajr_jamah"]),
                "dhuhr": hhmm(row["zuhr_jamah"]),
                "asr": hhmm(row["asr_jamah"]),
                "maghrib": hhmm(row["maghrib_jamah"]),
                "isha": hhmm(row["isha_jamah"]),
            })
            if day_num == 5:  # first Friday in Jan 2026; use Friday dhuhr jamah
                pass
        # jummah from first Friday in month
        from datetime import date
        for day_num, row in days:
            if date(2026, month_num, day_num).weekday() == 4:
                jummah = hhmm(row["zuhr_jamah"])
                break
        if not jummah:
            jummah = hhmm(days[0][1]["zuhr_jamah"])

        doc = {
            "month": MONTH_NAMES[month_num - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        }
        out = OUT_DIR / f"{MONTH_FILES[month_num - 1]}.json"
        out.write_text(json.dumps(doc, indent=2) + "\n")
        print(f"Wrote {out} ({len(days)} days, jummah {jummah})")


if __name__ == "__main__":
    main()
