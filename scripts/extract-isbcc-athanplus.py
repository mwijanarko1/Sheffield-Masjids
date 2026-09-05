#!/usr/bin/env python3
"""Extract ISBCC full-year prayer times from AthanPlus monthly HTML widgets."""
import json
import re
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

MASJID_ID = "zVKp9PLP"
BASE_URL = (
    "https://timing.athanplus.com/masjid/widgets/monthly"
    f"?theme=1&masjid_id={MASJID_ID}&date={{year}}-{{month:02d}}-01"
)
OUT_DIR = Path("public/data/mosques/us/boston/islamic-society-boston-cultural-center")

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def fetch_month(year: int, month: int) -> str:
    url = BASE_URL.format(year=year, month=month)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)"},
    )
    with urllib.request.urlopen(request) as response:
        return response.read().decode("utf-8", errors="replace")


def normalize_time(value: str, prayer: str) -> str:
    value = value.strip().upper().replace("SUNSET", "").strip()
    if not value:
        return ""
    match = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", value)
    if not match:
        return ""
    hour = int(match.group(1))
    minute = match.group(2)
    meridiem = match.group(3)
    if meridiem:
        if meridiem == "PM" and hour != 12:
            hour += 12
        if meridiem == "AM" and hour == 12:
            hour = 0
    elif prayer in {"asr", "maghrib", "isha"} and hour < 12:
        hour += 12
    elif prayer == "fajr" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def parse_prayer_rows(html: str) -> dict[int, dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows: dict[int, dict] = {}
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) != 9 or not cells[0].isdigit():
            continue
        day = int(cells[0])
        rows[day] = {
            "fajr": normalize_time(cells[3], "fajr"),
            "shurooq": normalize_time(cells[4], "shurooq"),
            "dhuhr": normalize_time(cells[5], "dhuhr"),
            "asr": normalize_time(cells[6], "asr"),
            "maghrib": normalize_time(cells[7], "maghrib"),
            "isha": normalize_time(cells[8], "isha"),
            "weekday": cells[2],
        }
    return rows


def parse_iqamah_rows(html: str) -> dict[int, dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows: dict[int, dict] = {}
    in_iqamah = False
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if not cells:
            continue
        header = " ".join(cells)
        if "IQAMAH" in header and "TIMINGS" in header:
            in_iqamah = True
            continue
        if not in_iqamah:
            continue
        if cells[0] in {"DATE", "FAJR", "DHUHR"}:
            continue
        if "JUMU" in cells[0]:
            break
        match = re.match(r"[A-Z]{3},\s*(\d{1,2})$", cells[0])
        if not match or len(cells) < 6:
            continue
        day = int(match.group(1))
        rows[day] = {
            "fajr": normalize_time(cells[1], "fajr"),
            "dhuhr": normalize_time(cells[2], "dhuhr"),
            "asr": normalize_time(cells[3], "asr"),
            "isha": normalize_time(cells[5], "isha"),
        }
    return rows


def expand_iqamah(days: list[int], sparse: dict[int, dict]) -> dict[int, dict]:
    if not sparse:
        return {}
    schedule_days = sorted(sparse)
    expanded: dict[int, dict] = {}
    cursor = 0
    for day in days:
        while cursor + 1 < len(schedule_days) and schedule_days[cursor + 1] <= day:
            cursor += 1
        expanded[day] = sparse[schedule_days[cursor]]
    return expanded


def parse_jummah(html: str) -> str:
    match = re.search(r"JUMU'AH\s+(\d{1,2}:\d{2}\s*[AP]M)", html, re.I)
    if match:
        return normalize_time(match.group(1), "dhuhr")
    soup = BeautifulSoup(html, "html.parser")
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) == 1 and re.match(r"\d{1,2}:\d{2}\s*[AP]M", cells[0], re.I):
            return normalize_time(cells[0], "dhuhr")
    return ""


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    year = 2026

    for month_num in range(1, 13):
        html = fetch_month(year, month_num)
        prayer_rows = parse_prayer_rows(html)
        iqamah_sparse = parse_iqamah_rows(html)
        jummah = parse_jummah(html)

        if not prayer_rows:
            print(f"SKIP {MONTH_NAMES[month_num - 1]}: no prayer rows")
            continue

        days = sorted(prayer_rows.keys())
        iqamah_rows = expand_iqamah(days, iqamah_sparse)
        prayer_times = []
        iqamah_times = []
        for day in days:
            prayer = prayer_rows[day]
            iq = iqamah_rows.get(day, {})
            prayer_times.append({
                "date": day,
                "fajr": prayer["fajr"],
                "shurooq": prayer["shurooq"],
                "dhuhr": prayer["dhuhr"],
                "asr": prayer["asr"],
                "maghrib": prayer["maghrib"],
                "isha": prayer["isha"],
            })
            iqamah_times.append({
                "date_range": str(day),
                "fajr": iq.get("fajr", prayer["fajr"]),
                "dhuhr": iq.get("dhuhr", prayer["dhuhr"]),
                "asr": iq.get("asr", prayer["asr"]),
                "maghrib": prayer["maghrib"],
                "isha": iq.get("isha", prayer["isha"]),
            })

        if not jummah:
            friday_day = next((day for day in days if prayer_rows[day]["weekday"] == "FRI"), None)
            if friday_day is not None:
                jummah = iqamah_rows.get(friday_day, {}).get("dhuhr", prayer_rows[friday_day]["dhuhr"])

        output = {
            "month": MONTH_NAMES[month_num - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah or iqamah_times[0]["dhuhr"],
        }
        out_path = OUT_DIR / f"{MONTH_FILES[month_num - 1]}.json"
        out_path.write_text(json.dumps(output, indent=2) + "\n")
        print(
            f"Wrote {out_path} ({len(days)} days, "
            f"{len(iqamah_sparse)} iqamah anchors, jummah {output['jummah_iqamah']})"
        )


if __name__ == "__main__":
    main()
