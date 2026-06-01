#!/usr/bin/env python3
"""
Import Croydon ICT prayer times from OCR of desktop timetable JPEGs.

Usage:
  tesseract "/path/to/croydon-ict"/*.jpeg /tmp/croydon-ict-ocr/base -l eng
  python3 scripts/import-croydon-ict-from-images.py \\
    --ocr-dir /tmp/croydon-ict-ocr \\
    --out-dir public/data/mosques/gb/london/croydon-ict \\
    --year 2026
"""
from __future__ import annotations

import argparse
import json
import re
from calendar import monthrange
from dataclasses import dataclass
from pathlib import Path

JUMMAH_IQAMAH = "13:15"
MONTH_NAMES = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]
MONTH_UPPER = [m.upper() for m in MONTH_NAMES]

MONTH_MAP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

# OCR day fixes: 2ist -> 21, etc.
DAY_FIX = {"ist": "1", "2ist": "21", "2eth": "28", "ltth": "14", "i9th": "19"}


@dataclass
class DayTimes:
    fajr: str
    fajr_jamat: str
    shurooq: str
    dhuhr: str
    dhuhr_jamat: str
    asr: str
    asr_jamat: str
    maghrib: str
    isha: str
    isha_jamat: str


def pad2(n: int) -> str:
    return f"{n:02d}"


def normalize_line(line: str) -> str:
    line = line.replace("«", " ").replace("©", " ").replace("B", "8").replace("S:", "5:")
    line = re.sub(r"(\d)[.:](\d{2})", r"\1:\2", line)
    for bad, good in DAY_FIX.items():
        line = line.replace(bad, good)
    return line


def to_24h(raw: str, column: int) -> str:
    raw = raw.strip()
    m = re.match(r"^(\d{1,2}):(\d{2})$", raw)
    if not m:
        return ""
    h, mi = int(m.group(1)), m.group(2)
    # column: 0 fajr, 1 fajr jamat, 2 sunrise, 3 dhuhr, 4 dhuhr jamat,
    # 5 asr, 6 asr jamat, 7 maghrib, 8 isha, 9 isha jamat
    if column in (3, 4) and 1 <= h <= 2:
        h += 12
    elif column in (5, 6) and 1 <= h <= 7:
        h += 12
    elif column == 7 and 4 <= h <= 9:
        h += 12
    elif column in (8, 9) and 5 <= h <= 11:
        h += 12
    return f"{pad2(h)}:{mi}"


def times_to_row(times: list[str]) -> DayTimes | None:
    if len(times) < 10:
        return None
    converted = [to_24h(times[i], i) for i in range(10)]
    if any(not t for t in converted):
        return None
    return DayTimes(*converted)  # type: ignore[arg-type]


def extract_times(tail: str) -> list[str]:
    tail = tail.replace("-", " ")
    return re.findall(r"\d{1,2}:\d{2}", tail)


def _month_from_token(token: str) -> int | None:
    key = token.lower().strip()
    if key.startswith("sept"):
        return 9
    for name, num in MONTH_MAP.items():
        if key.startswith(name[:3]):
            return num
    return None


def parse_month_day(line: str, default_year: int) -> tuple[int, int, int] | None:
    """Return (year, month, day) from gregorian fragment in line."""
    line = re.sub(r"\bIst\b", "1st", line, flags=re.I)
    line = re.sub(r"\bi(\d)", r"\1", line)  # i9th -> 9th

    candidates: list[tuple[int, int]] = []

    for m in re.finditer(
        r"(\d{1,2})(?:st|nd|rd|th)?\s*"
        r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)",
        line,
        re.I,
    ):
        month = _month_from_token(m.group(2))
        if month:
            candidates.append((int(m.group(1)), month))

    for m in re.finditer(
        r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+(\d{1,2})(?:st|nd|rd|th)?",
        line,
        re.I,
    ):
        month = _month_from_token(m.group(1))
        if month:
            candidates.append((int(m.group(2)), month))

    for m in re.finditer(
        r"(\d{1,2})(?:st|nd|rd|th)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b",
        line,
        re.I,
    ):
        month = _month_from_token(m.group(2))
        if month:
            candidates.append((int(m.group(1)), month))

    if not candidates:
        return None
    day, month = candidates[-1]
    return default_year, month, day


def parse_ocr_file(path: Path, default_year: int) -> dict[str, DayTimes]:
    rows: dict[str, DayTimes] = {}
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = normalize_line(raw_line)
        if not re.search(r"\d{1,2}:\d{2}", line):
            continue
        g = parse_month_day(line, default_year)
        if not g:
            continue
        year, month, day = g
        # strip date portion for times
        tail = line
        times = extract_times(tail)
        row = times_to_row(times)
        if row:
            iso = f"{year}-{pad2(month)}-{pad2(day)}"
            rows[iso] = row
    return rows


# Full Ramadan 2026 from published timetable
RAMADAN_2026: dict[str, tuple[str, ...]] = {
    "2026-02-18": ("05:29", "06:00", "07:06", "12:20", "13:00", "14:50", "15:30", "17:24", "18:53", "20:00"),
    "2026-02-19": ("05:27", "06:00", "07:04", "12:19", "13:00", "14:51", "15:30", "17:26", "18:55", "20:00"),
    "2026-02-20": ("05:25", "05:45", "07:02", "12:19", "13:00", "14:53", "15:30", "17:28", "18:57", "20:00"),
    "2026-02-21": ("05:23", "05:45", "07:00", "12:19", "13:00", "14:54", "15:30", "17:30", "18:58", "20:00"),
    "2026-02-22": ("05:21", "05:45", "06:58", "12:19", "13:00", "14:55", "15:30", "17:31", "18:59", "20:00"),
    "2026-02-23": ("05:19", "05:45", "06:56", "12:19", "13:00", "14:57", "15:30", "17:33", "19:01", "20:00"),
    "2026-02-24": ("05:17", "05:45", "06:54", "12:19", "13:00", "14:58", "15:30", "17:35", "19:03", "20:00"),
    "2026-02-25": ("05:14", "05:45", "06:51", "12:19", "13:00", "14:59", "15:30", "17:37", "19:04", "20:00"),
    "2026-02-26": ("05:12", "05:45", "06:49", "12:19", "13:00", "15:01", "15:30", "17:39", "19:06", "20:00"),
    "2026-02-27": ("05:10", "05:30", "06:47", "12:18", "13:00", "15:02", "15:30", "17:40", "19:07", "20:00"),
    "2026-02-28": ("05:08", "05:30", "06:45", "12:18", "13:00", "15:03", "15:30", "17:42", "19:09", "20:00"),
    "2026-03-01": ("05:06", "05:30", "06:43", "12:18", "13:00", "15:04", "15:30", "17:44", "19:10", "20:00"),
    "2026-03-02": ("05:04", "05:30", "06:41", "12:18", "13:00", "15:06", "15:30", "17:46", "19:12", "20:00"),
    "2026-03-03": ("05:02", "05:30", "06:39", "12:18", "13:00", "15:07", "15:30", "17:47", "19:12", "20:00"),
    "2026-03-04": ("04:59", "05:30", "06:36", "12:17", "13:00", "15:08", "15:30", "17:49", "19:14", "20:00"),
    "2026-03-05": ("04:57", "05:30", "06:34", "12:17", "13:00", "15:09", "15:30", "17:51", "19:15", "20:00"),
    "2026-03-06": ("04:55", "05:15", "06:32", "12:17", "13:00", "15:11", "15:30", "17:53", "19:17", "20:00"),
    "2026-03-07": ("04:53", "05:15", "06:30", "12:17", "13:00", "15:12", "15:30", "17:54", "19:17", "20:00"),
    "2026-03-08": ("04:51", "05:15", "06:28", "12:16", "13:00", "15:13", "15:30", "17:56", "19:19", "20:00"),
    "2026-03-09": ("04:48", "05:15", "06:25", "12:16", "13:00", "15:14", "15:30", "17:58", "19:20", "20:00"),
    "2026-03-10": ("04:46", "05:15", "06:23", "12:16", "13:00", "15:15", "15:30", "18:00", "19:22", "20:00"),
    "2026-03-11": ("04:44", "05:15", "06:21", "12:16", "13:00", "15:16", "15:30", "18:01", "19:23", "20:00"),
    "2026-03-12": ("04:42", "05:15", "06:19", "12:15", "13:00", "15:18", "15:30", "18:03", "19:25", "20:00"),
    "2026-03-13": ("04:39", "05:00", "06:16", "12:15", "13:00", "15:19", "15:45", "18:05", "19:26", "20:00"),
    "2026-03-14": ("04:37", "05:00", "06:14", "12:15", "13:00", "15:20", "15:45", "18:06", "19:27", "20:00"),
    "2026-03-15": ("04:35", "05:00", "06:12", "12:15", "13:00", "15:21", "15:45", "18:08", "19:29", "20:00"),
    "2026-03-16": ("04:33", "05:00", "06:10", "12:14", "13:00", "15:22", "15:45", "18:10", "19:31", "20:00"),
    "2026-03-17": ("04:30", "05:00", "06:07", "12:14", "13:00", "15:23", "15:45", "18:12", "19:32", "20:00"),
    "2026-03-18": ("04:28", "05:00", "06:05", "12:14", "13:00", "15:24", "15:45", "18:13", "19:33", "20:00"),
    "2026-03-19": ("04:26", "05:00", "06:03", "12:13", "13:00", "15:25", "15:45", "18:15", "19:35", "20:00"),
}

# January 2026 (Rajab sheet) — verified from timetable image
JANUARY_2026: dict[str, tuple[str, ...]] = {
    f"2026-01-{pad2(d)}": row
    for d, row in {
        1: ("06:26", "06:45", "08:03", "12:09", "12:45", "13:46", "14:00", "16:05", "17:42", "19:15"),
        2: ("06:26", "06:45", "08:03", "12:10", "13:00", "13:47", "14:00", "16:06", "17:43", "19:15"),
        3: ("06:26", "06:45", "08:03", "12:10", "13:15", "13:48", "14:00", "16:08", "17:45", "19:15"),
        4: ("06:26", "06:45", "08:03", "12:11", "13:15", "13:49", "14:00", "16:09", "17:46", "19:15"),
        5: ("06:25", "06:45", "08:02", "12:11", "12:45", "13:50", "14:00", "16:10", "17:47", "19:15"),
        6: ("06:25", "06:45", "08:02", "12:12", "12:45", "13:51", "14:00", "16:11", "17:48", "19:15"),
        7: ("06:25", "06:45", "08:02", "12:12", "12:45", "13:52", "14:00", "16:12", "17:49", "19:15"),
        8: ("06:24", "06:45", "08:01", "12:12", "12:45", "13:54", "14:00", "16:14", "17:51", "19:15"),
        9: ("06:24", "06:45", "08:01", "12:13", "13:00", "13:55", "14:15", "16:15", "17:52", "19:15"),
        10: ("06:23", "06:45", "08:00", "12:13", "13:15", "13:56", "14:15", "16:17", "17:54", "19:15"),
        11: ("06:23", "06:45", "08:00", "12:14", "13:15", "13:57", "14:15", "16:18", "17:55", "19:15"),
        12: ("06:22", "06:45", "07:59", "12:14", "12:45", "13:58", "14:15", "16:19", "17:56", "19:15"),
        13: ("06:21", "06:45", "07:58", "12:14", "12:45", "14:00", "14:15", "16:21", "17:58", "19:15"),
        14: ("06:20", "06:45", "07:57", "12:15", "12:45", "14:01", "14:15", "16:22", "17:59", "19:15"),
        15: ("06:20", "06:45", "07:57", "12:15", "12:45", "14:02", "14:15", "16:24", "18:01", "19:15"),
        16: ("06:19", "06:45", "07:56", "12:15", "13:00", "14:03", "14:15", "16:26", "18:03", "19:15"),
        17: ("06:18", "06:45", "07:55", "12:16", "13:15", "14:05", "14:15", "16:27", "18:04", "19:15"),
        18: ("06:17", "06:45", "07:54", "12:16", "13:15", "14:06", "14:15", "16:29", "18:06", "19:15"),
        19: ("06:16", "06:45", "07:53", "12:16", "12:45", "14:07", "14:15", "16:30", "18:07", "19:15"),
    }.items()
}


def merge_verified(data: dict[str, DayTimes], source: dict[str, tuple[str, ...]]) -> None:
    for iso, t in source.items():
        data[iso] = DayTimes(*t)  # type: ignore[arg-type]


def day_to_json(day: int, d: DayTimes) -> tuple[dict, dict]:
    prayer = {
        "date": day,
        "fajr": d.fajr,
        "shurooq": d.shurooq,
        "dhuhr": d.dhuhr,
        "asr": d.asr,
        "maghrib": d.maghrib,
        "isha": d.isha,
    }
    iqamah = {
        "date_range": str(day),
        "fajr": d.fajr_jamat,
        "dhuhr": d.dhuhr_jamat,
        "asr": d.asr_jamat,
        "maghrib": d.maghrib,
        "isha": d.isha_jamat,
    }
    return prayer, iqamah


def build_month(year: int, month: int, data: dict[str, DayTimes]) -> dict | None:
    days_in_month = monthrange(year, month)[1]
    prayers: list[dict] = []
    iqamahs: list[dict] = []
    for day in range(1, days_in_month + 1):
        iso = f"{year}-{pad2(month)}-{pad2(day)}"
        entry = data.get(iso)
        if not entry:
            return None
        p, i = day_to_json(day, entry)
        prayers.append(p)
        iqamahs.append(i)
    return {
        "month": MONTH_UPPER[month - 1],
        "prayer_times": prayers,
        "iqamah_times": iqamahs,
        "jummah_iqamah": JUMMAH_IQAMAH,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ocr-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()

    all_data: dict[str, DayTimes] = {}

    for txt in sorted(args.ocr_dir.glob("*.txt")):
        year_hint = int(txt.name[:4]) if txt.name[:4].isdigit() else args.year
        parsed = parse_ocr_file(txt, year_hint)
        for iso, row in parsed.items():
            if iso.startswith(str(args.year)):
                all_data[iso] = row

    merge_verified(all_data, RAMADAN_2026)
    merge_verified(all_data, JANUARY_2026)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    complete = 0
    incomplete: list[str] = []

    for month in range(1, 13):
        payload = build_month(args.year, month, all_data)
        name = MONTH_NAMES[month - 1]
        if payload is None:
            incomplete.append(name)
            continue
        (args.out_dir / f"{name}.json").write_text(
            json.dumps(payload, indent=2) + "\n", encoding="utf-8"
        )
        complete += 1
        print(f"✓ {name}.json ({len(payload['prayer_times'])} days)")

    ydates = sorted(k for k in all_data if k.startswith(str(args.year)))
    print(f"\nDates extracted for {args.year}: {len(ydates)}")
    if incomplete:
        print(f"Incomplete months: {', '.join(incomplete)}")


if __name__ == "__main__":
    main()
