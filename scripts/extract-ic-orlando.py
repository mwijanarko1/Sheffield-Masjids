#!/usr/bin/env python3
"""Extract IC Orlando full-year prayer times from monthly HTML timetable pages."""
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

BASE_URL = "https://icorlando.org/prayer-times/{month}/"
OUT_DIR = Path("public/data/mosques/us/orlando/islamic-center-orlando")

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_SLUGS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def fetch_month(month_slug: str) -> str:
    url = BASE_URL.format(month=month_slug)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)"},
    )
    with urllib.request.urlopen(request) as response:
        return response.read().decode("utf-8", errors="replace")


def normalize_time(value: str) -> str:
    match = re.match(r"(\d{1,2}):(\d{2})\s*([ap]m)", value.strip(), re.I)
    if not match:
        return ""
    hour = int(match.group(1))
    minute = match.group(2)
    meridiem = match.group(3).lower()
    if meridiem == "pm" and hour != 12:
        hour += 12
    if meridiem == "am" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def parse_month(html: str, year: int, month_num: int) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    prayer_times = []
    iqamah_times = []
    jummah = ""

    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) != 12 or not cells[0].isdigit():
            continue
        day = int(cells[0])
        prayer_times.append({
            "date": day,
            "fajr": normalize_time(cells[1]),
            "shurooq": normalize_time(cells[3]),
            "dhuhr": normalize_time(cells[4]),
            "asr": normalize_time(cells[6]),
            "maghrib": normalize_time(cells[8]),
            "isha": normalize_time(cells[10]),
        })
        iqamah_times.append({
            "date_range": str(day),
            "fajr": normalize_time(cells[2]),
            "dhuhr": normalize_time(cells[5]),
            "asr": normalize_time(cells[7]),
            "maghrib": normalize_time(cells[9]),
            "isha": normalize_time(cells[11]),
        })
        if date(year, month_num, day).weekday() == 4:
            jummah = normalize_time(cells[5])

    return {
        "month": MONTH_NAMES[month_num - 1],
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah or (iqamah_times[0]["dhuhr"] if iqamah_times else ""),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    year = 2026

    for month_num, month_slug in enumerate(MONTH_SLUGS, start=1):
        html = fetch_month(month_slug)
        output = parse_month(html, year, month_num)
        if not output["prayer_times"]:
            print(f"SKIP {output['month']}: no rows")
            continue
        out_path = OUT_DIR / f"{month_slug}.json"
        out_path.write_text(json.dumps(output, indent=2) + "\n")
        print(
            f"Wrote {out_path} ({len(output['prayer_times'])} days, "
            f"jummah {output['jummah_iqamah']})"
        )


if __name__ == "__main__":
    main()
