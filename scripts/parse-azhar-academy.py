#!/usr/bin/env python3
"""Parse the Azhar Academy Bolton 2026 SALAAT TIMETABLE PDF (pdftotext -layout).

Columns per row: Date Day Lunar | Fajar Sunrise Dhuhr Asr Sunset | Isha |
Fajar Dhuhr Asr Maghrib Isha (jamaat). Maghrib adhan == Sunset. Friday
dhuhr jamaat is the Jumu'ah iqamah.
"""
import json
import re
import sys
from pathlib import Path

MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
FILES = [m.lower() for m in MONTHS]

TIME = r"\d{1,2}\.\d{2}"
# day, weekday, lunar, fajr, sunrise, dhuhr, asr, sunset, isha, jFajr, jDhuhr, jAsr, jMaghrib, jIsha
ROW_RE = re.compile(
    r"^\s*(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+"
    rf"({TIME})\s+({TIME})\s+({TIME})\s+({TIME})\s+({TIME})\s+({TIME})\s+"
    rf"({TIME})\s+({TIME})\s+({TIME})\s+({TIME})\s+({TIME})\s*$"
)


def to24_am(t: str) -> str:
    """'6.46' -> '06:46' (AM time, 12-hour format)."""
    h, m = t.split(".")
    return f"{int(h):02d}:{m}"


def to24_pm(t: str) -> str:
    """'1.18' -> '13:18', '12.45' -> '12:45' (PM time, 12-hour format)."""
    h, m = t.split(".")
    hh = int(h)
    if hh < 12:
        hh += 12
    return f"{hh:02d}:{m}"


def parse_month(lines: list[str]) -> dict | None:
    rows = []
    for line in lines:
        m = ROW_RE.match(line)
        if not m:
            continue
        day, wd, _lunar, fajr, sunrise, dhuhr, asr, sunset, isha, jf, jd, ja, jm, ji = m.groups()
        rows.append({
            "date": int(day),
            "weekday": wd,
            "fajr": to24_am(fajr),
            "shurooq": to24_am(sunrise),
            "dhuhr": to24_pm(dhuhr),
            "asr": to24_pm(asr),
            "maghrib": to24_pm(sunset),
            "isha": to24_pm(isha),
            "jfajr": to24_am(jf),
            "jdhuhr": to24_pm(jd),
            "jasr": to24_pm(ja),
            "jmaghrib": to24_pm(jm),
            "jisha": to24_pm(ji),
        })
    if not rows:
        return None
    rows.sort(key=lambda r: r["date"])
    prayer_times = [{k: r[k] for k in ("date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")} for r in rows]
    iqamah_times = [{
        "date_range": str(r["date"]),
        "fajr": r["jfajr"],
        "dhuhr": r["jdhuhr"],
        "asr": r["jasr"],
        "maghrib": r["jmaghrib"],
        "isha": r["jisha"],
    } for r in rows]
    fri = next((r for r in rows if r["weekday"] == "Fri"), None)
    jummah = fri["jdhuhr"] if fri else (rows[0]["jdhuhr"] if rows else "")
    return {"month": None, "prayer_times": prayer_times, "iqamah_times": iqamah_times, "jummah_iqamah": jummah}


def main() -> None:
    txt = Path(sys.argv[1] if len(sys.argv) > 1 else "azhar-2026.txt").read_text()
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Split the text by month headers (e.g. "January-2026  ... 12 RAJAB 1447 AH").
    # A header may appear at the top of a page before the column row, so we
    # attach only the lines that follow it until the next month header.
    sections: list[tuple[str, list[str]]] = []
    cur: tuple[str, list[str]] | None = None
    for line in txt.splitlines():
        m = re.match(r"^([A-Z][a-z]+)-2026\b", line.strip())
        if m:
            if cur:
                sections.append(cur)
            cur = (m.group(1).upper(), [])
        elif cur is not None:
            cur[1].append(line)
    if cur:
        sections.append(cur)

    names = {m.lower(): m for m in MONTHS}
    found = {name: False for name in MONTHS}
    for raw_name, lines in sections:
        month_name = names.get(raw_name.lower())
        if month_name is None:
            continue
        data = parse_month(lines)
        if data is None:
            print(f"  SKIP {month_name}: no rows parsed")
            continue
        data["month"] = month_name
        path = out_dir / f"{month_name.lower()}.json"
        path.write_text(json.dumps(data, indent=2))
        print(f"  Wrote {path} ({len(data['prayer_times'])} days, jummah {data['jummah_iqamah']})")
        found[month_name] = True

    missing = [m for m in MONTHS if not found[m]]
    if missing:
        print(f"MISSING: {', '.join(missing)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
