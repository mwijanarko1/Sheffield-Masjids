#!/usr/bin/env python3
"""Reparse Taiyabah Masjid 2026 PDF text into monthly JSON.

Source PDF: https://www.taiyabahmasjid.com/wp-content/uploads/2026/01/Salah-Timetable-2026_251221_105302-1.pdf

Rules:
- Adhan maghrib = maghrib jamaat (PDF has no separate maghrib beginning column)
- All iqamah times are real HH:MM (no Adhan+0)
- 1st Jummah = Friday Zuhr jamaat from the table
- 2nd Jummah = "2ND JUMMA TIMES 2026" schedule (Apr 3–Oct 23 = 15:30 every Friday)
- Friday iqamah rows get jummah: "HH:MM / HH:MM"
"""
from __future__ import annotations

import calendar
import json
import re
from datetime import date, timedelta
from pathlib import Path

TEXT_PATH = Path("/tmp/taiyabah/Salah-Timetable-2026.txt")
OUT = Path(__file__).resolve().parents[1] / "public/data/mosques/gb/bolton/taiyabah-masjid"
YEAR = 2026
MONTHS = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
]
MONTH_NUM = {m: i + 1 for i, m in enumerate(MONTHS)}
DAYS_IN = {m: calendar.monthrange(YEAR, MONTH_NUM[m])[1] for m in MONTHS}

DITTO_CHARS = set('"“”\'„‟')
TIME_RE = re.compile(r"\d{1,2}:\d{2}")
PM_RE = re.compile(r"(\d{1,2}):(\d{2})\s*([AaPp][Mm])")
ORD_DATE = re.compile(
    r"(\d{1,2})(?:st|nd|rd|th)\s+"
    r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+2026",
    re.I,
)
WEEKDAY = r"(?:MON|TUE|WED|THU|FRI|SAT|SUN)"
ROW_RE = re.compile(rf"^\s*(\d{{1,2}})\*?\s+{WEEKDAY}\b(.*)$", re.I)

# begin: fajr AM, sunrise AM, zuhr/asr/isha PM-context
BEGIN_PM = [False, False, True, True, True]
# jamaat: fajr AM, zuhr/asr/maghrib/isha PM-context
JAMAAT_PM = [False, True, True, True, True]


def is_ditto(tok: str) -> bool:
    t = tok.strip()
    return (not t) or all(c in DITTO_CHARS or c.isspace() for c in t)


def to_24(t: str, pm_field: bool) -> str:
    m = re.match(r"^(\d{1,2}):(\d{2})$", t.strip())
    if not m:
        raise ValueError(f"bad time {t!r}")
    h, mi = int(m.group(1)), int(m.group(2))
    if pm_field and h < 12:
        h += 12
    return f"{h:02d}:{mi:02d}"


def parse_pm_clock(s: str) -> str:
    m = PM_RE.search(s)
    if not m:
        raise ValueError(s)
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3).upper()
    if ap == "PM" and h < 12:
        h += 12
    if ap == "AM" and h == 12:
        h = 0
    return f"{h:02d}:{mi:02d}"


def parse_second_jummah(text: str) -> dict[date, str]:
    out: dict[date, str] = {}
    for line in text.splitlines():
        dm = ORD_DATE.search(line)
        if not dm:
            continue
        if "PM" not in line.upper() and "AM" not in line.upper():
            continue
        try:
            t = parse_pm_clock(line)
        except ValueError:
            continue
        hh = int(t[:2])
        if hh < 12 or hh > 17:
            continue
        day = int(dm.group(1))
        mon = dm.group(2).upper()
        out[date(YEAR, MONTH_NUM[mon], day)] = t

    # Apr 3 – Oct 23 every Friday → 15:30 (2nd jummah)
    d = date(YEAR, 4, 3)
    end = date(YEAR, 10, 23)
    while d <= end:
        if d.weekday() == 4:
            out[d] = "15:30"
        d += timedelta(days=1)
    return out


def extract_time_seq(rest: str) -> list[str]:
    seq: list[str] = []
    for mm in re.finditer(r'(\d{1,2}:\d{2})|([“”"\'„‟]+)', rest):
        if mm.group(1):
            seq.append(mm.group(1))
        else:
            seq.append('"')
    return seq


def parse_month(
    month: str,
    lines: list[str],
    month_starts: dict[str, int],
    second_jummah: dict[date, str],
) -> tuple[list[dict], list[dict], str]:
    start = month_starts[month]
    ends = sorted(month_starts.values())
    idx = ends.index(start)
    end = ends[idx + 1] if idx + 1 < len(ends) else len(lines)
    section = lines[start:end]

    prayer: list[dict] = []
    iqamah: list[dict] = []
    prev_b = {f: None for f in ["fajr", "shurooq", "dhuhr", "asr", "isha"]}
    prev_j = {f: None for f in ["fajr", "dhuhr", "asr", "maghrib", "isha"]}
    first_friday_jummah: str | None = None
    expected_days = DAYS_IN[month]
    mnum = MONTH_NUM[month]
    seen_days: set[int] = set()

    for line in section:
        m = ROW_RE.match(line)
        if not m:
            continue
        day = int(m.group(1))
        if day < 1 or day > expected_days or day in seen_days:
            continue
        seq = extract_time_seq(m.group(2))
        if len(seq) < 6:
            raise ValueError(f"{month} day {day}: only {len(seq)} tokens: {line[:120]}")
        if len(seq) > 10:
            seq = seq[:5] + seq[-5:]
        while len(seq) < 10:
            seq.append('"')

        begin_raw, jamaat_raw = seq[:5], seq[5:10]
        begin: dict[str, str] = {}
        for i, f in enumerate(["fajr", "shurooq", "dhuhr", "asr", "isha"]):
            raw = begin_raw[i]
            if is_ditto(raw):
                if not prev_b[f]:
                    raise ValueError(f"{month} d{day} begin {f} ditto with no prev")
                begin[f] = prev_b[f]  # type: ignore[assignment]
            else:
                begin[f] = to_24(raw, BEGIN_PM[i])
                prev_b[f] = begin[f]

        jamaat: dict[str, str] = {}
        for i, f in enumerate(["fajr", "dhuhr", "asr", "maghrib", "isha"]):
            raw = jamaat_raw[i]
            if is_ditto(raw):
                if not prev_j[f]:
                    raise ValueError(f"{month} d{day} jamaat {f} ditto with no prev: {line}")
                jamaat[f] = prev_j[f]  # type: ignore[assignment]
            else:
                jamaat[f] = to_24(raw, JAMAAT_PM[i])
                prev_j[f] = jamaat[f]

        prayer.append(
            {
                "date": day,
                "fajr": begin["fajr"],
                "shurooq": begin["shurooq"],
                "dhuhr": begin["dhuhr"],
                "asr": begin["asr"],
                "maghrib": jamaat["maghrib"],
                "isha": begin["isha"],
            }
        )

        iq: dict[str, str] = {
            "date_range": str(day),
            "fajr": jamaat["fajr"],
            "dhuhr": jamaat["dhuhr"],
            "asr": jamaat["asr"],
            "maghrib": jamaat["maghrib"],
            "isha": jamaat["isha"],
        }

        d = date(YEAR, mnum, day)
        if d.weekday() == 4:
            first = jamaat["dhuhr"]
            second = second_jummah.get(d)
            iq["jummah"] = f"{first} / {second}" if second else first
            if first_friday_jummah is None:
                first_friday_jummah = iq["jummah"]

        iqamah.append(iq)
        seen_days.add(day)

    if len(prayer) != expected_days:
        missing = sorted(set(range(1, expected_days + 1)) - seen_days)
        raise SystemExit(f"{month}: got {len(prayer)} days, expected {expected_days}, missing {missing}")

    return prayer, iqamah, first_friday_jummah or "13:30"


def main() -> None:
    text = TEXT_PATH.read_text()
    lines = text.splitlines()
    second_jummah = parse_second_jummah(text)
    print(f"2nd jummah Fridays: {len(second_jummah)}")

    month_starts: dict[str, int] = {}
    for i, line in enumerate(lines):
        for m in MONTHS:
            if re.search(rf"\b{m} 2026\b", line) and "BEGINNING" in line:
                month_starts[m] = i
                break
    if len(month_starts) != 12:
        raise SystemExit(f"month headers found: {sorted(month_starts)}")

    OUT.mkdir(parents=True, exist_ok=True)
    time_re = re.compile(r"^\d{2}:\d{2}$")

    for month in MONTHS:
        pt, iq, jummah = parse_month(month, lines, month_starts, second_jummah)
        data = {
            "month": month,
            "prayer_times": pt,
            "iqamah_times": iq,
            "jummah_iqamah": jummah,
        }
        path = OUT / f"{month.lower()}.json"
        path.write_text(json.dumps(data, indent=2) + "\n")
        fridays = [r for r in iq if "jummah" in r]
        print(f"✓ {path.name} days={len(pt)} jummah_iqamah={jummah!r} fridays={len(fridays)}")

    # assertions from known PDF rows
    jan = json.loads((OUT / "january.json").read_text())
    assert jan["prayer_times"][0] == {
        "date": 1,
        "fajr": "06:36",
        "shurooq": "08:26",
        "dhuhr": "12:20",
        "asr": "14:13",
        "maghrib": "16:06",
        "isha": "17:48",
    }
    assert jan["iqamah_times"][1]["jummah"] == "12:45 / 13:40"  # Fri 2 Jan
    assert jan["iqamah_times"][8]["jummah"] == "12:45 / 13:50"  # Fri 9 Jan
    assert jan["iqamah_times"][15]["jummah"] == "12:45 / 14:00"  # Fri 16 Jan

    apr = json.loads((OUT / "april.json").read_text())
    fri3 = next(r for r in apr["iqamah_times"] if r["date_range"] == "3")
    assert fri3["dhuhr"] == "13:30"
    assert fri3["jummah"] == "13:30 / 15:30"

    oct_ = json.loads((OUT / "october.json").read_text())
    fri23 = next(r for r in oct_["iqamah_times"] if r["date_range"] == "23")
    fri30 = next(r for r in oct_["iqamah_times"] if r["date_range"] == "30")
    assert fri23["jummah"] == "13:30 / 15:30"
    assert fri30["jummah"] == "12:45 / 14:15"

    bad = 0
    for f in sorted(OUT.glob("*.json")):
        d = json.loads(f.read_text())
        for row in d["iqamah_times"]:
            for k, v in row.items():
                if k == "date_range":
                    continue
                if k == "jummah":
                    parts = [p.strip() for p in v.split("/")]
                    if not all(time_re.match(p) for p in parts):
                        print("BAD jummah", f.name, row)
                        bad += 1
                    continue
                if not time_re.match(v):
                    print("BAD", f.name, k, v, row)
                    bad += 1
    if bad:
        raise SystemExit(f"{bad} bad time values")
    print("ALL ASSERTS OK")


if __name__ == "__main__":
    main()
