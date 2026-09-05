#!/usr/bin/env python3
"""Extract ADAMS Center 2026 prayer times from published PDF timetable."""
import json
import re
import subprocess
import urllib.request
from collections import defaultdict
from pathlib import Path

PDF_URL = "https://adamscenter.org/wp-content/uploads/2026/02/ADAMS-Prayer-Times-2026.pdf"
OUT_DIR = Path("public/data/mosques/us/sterling/adams-center")

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

ROW_RE = re.compile(r"^\s*.+?\s+(\d{1,2}/\d{1,2}/2026)\s+(\S+)\s+(.*)$", re.IGNORECASE)
TIME_RE = re.compile(r"(\d{1,2}:\d{2}\s*[AP]M)", re.IGNORECASE)


def to_24h(value: str) -> str:
    value = value.strip().upper()
    match = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)", value)
    if not match:
        return value
    hour = int(match.group(1))
    minute = match.group(2)
    meridiem = match.group(3)
    if meridiem == "PM" and hour != 12:
        hour += 12
    if meridiem == "AM" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def fetch_pdf_text() -> str:
    pdf_path = Path("/tmp/adams-prayer-2026.pdf")
    txt_path = Path("/tmp/adams-prayer-2026.txt")
    request = urllib.request.Request(
        PDF_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)"},
    )
    with urllib.request.urlopen(request) as response:
        pdf_path.write_bytes(response.read())
    subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), str(txt_path)],
        check=True,
    )
    return txt_path.read_text()


def main() -> None:
    text = fetch_pdf_text()
    by_month: dict[int, list[dict]] = defaultdict(list)

    for line in text.splitlines():
        match = ROW_RE.match(line)
        if not match:
            continue
        greg, weekday, rest = match.groups()
        times = TIME_RE.findall(rest)
        if len(times) < 11:
            continue
        fajr, fajr_iq, sunrise, dhuhr, dhuhr_iq, asr, asr_iq, maghrib, maghrib_iq, isha, isha_iq = times[:11]
        month_num, day_num = map(int, greg.split("/")[0:2])
        by_month[month_num].append({
            "date": day_num,
            "weekday": weekday,
            "fajr": to_24h(fajr),
            "fajr_iq": to_24h(fajr_iq),
            "shurooq": to_24h(sunrise),
            "dhuhr": to_24h(dhuhr),
            "dhuhr_iq": to_24h(dhuhr_iq),
            "asr": to_24h(asr),
            "asr_iq": to_24h(asr_iq),
            "maghrib": to_24h(maghrib),
            "maghrib_iq": to_24h(maghrib_iq),
            "isha": to_24h(isha),
            "isha_iq": to_24h(isha_iq),
        })

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for month_num in range(1, 13):
        days = sorted(by_month.get(month_num, []), key=lambda row: row["date"])
        if not days:
            print(f"SKIP {MONTH_NAMES[month_num - 1]}: no rows")
            continue

        prayer_times = [{
            "date": row["date"],
            "fajr": row["fajr"],
            "shurooq": row["shurooq"],
            "dhuhr": row["dhuhr"],
            "asr": row["asr"],
            "maghrib": row["maghrib"],
            "isha": row["isha"],
        } for row in days]

        iqamah_times = [{
            "date_range": str(row["date"]),
            "fajr": row["fajr_iq"],
            "dhuhr": row["dhuhr_iq"],
            "asr": row["asr_iq"],
            "maghrib": row["maghrib_iq"],
            "isha": row["isha_iq"],
        } for row in days]

        friday = next((row for row in days if row["weekday"].upper() == "FRIDAY"), None)
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
