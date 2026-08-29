#!/usr/bin/env python3
"""Parse Masjid At-Taqwa (Leicester) monthly prayer PDFs (pdftotext -layout).

Row format (single line per day):
  WKD DD  FAJR SUNRISE DHUHR ASR ISHA  FAJR DHUHR ASR MAGHRIB ISHA
Beginnings: fajr, sunrise, dhuhr, asr, isha (no maghrib adhan published;
maghrib jamat == adhan). Jamat: fajr, dhuhr, asr, maghrib, isha.
Times are 12h H:MM without am/pm; fajr/sunrise are AM, the rest PM.
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

ROW_RE = re.compile(
    r"^\s*(SUN|MON|TUE|WED|THUR|THU|FRI|SAT)\*?\s+(\d{1,2})\s+"
    r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+"
    r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s*$"
)


def to24_am(t: str) -> str:
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


def to24_pm(t: str) -> str:
    h, m = t.split(":")
    hh = int(h)
    if 1 <= hh <= 11:
        hh += 12
    return f"{hh:02d}:{m}"


def to24_dhuhr(t: str) -> str:
    h, m = t.split(":")
    hh = int(h)
    if 1 <= hh <= 9:
        hh += 12
    return f"{hh:02d}:{m}"


def parse_month(lines: list[str]) -> dict | None:
    rows = []
    for line in lines:
        m = ROW_RE.match(line)
        if not m:
            continue
        wd, date, fajr, sunrise, dhuhr, asr, isha, jf, jd, ja, jm, ji = m.groups()
        rows.append({
            "date": int(date),
            "weekday": wd,
            "fajr": to24_am(fajr),
            "shurooq": to24_am(sunrise),
            "dhuhr": to24_dhuhr(dhuhr),
            "asr": to24_pm(asr),
            "maghrib": to24_pm(jm),  # no maghrib adhan published; == jamat
            "isha": to24_pm(isha),
            "jf": to24_am(jf),
            "jd": to24_dhuhr(jd),
            "ja": to24_pm(ja),
            "jm": to24_pm(jm),
            "ji": to24_pm(ji),
        })
    if not rows:
        return None
    rows.sort(key=lambda r: r["date"])
    prayer_times = [{k: r[k] for k in ("date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")} for r in rows]
    iqamah_times = [{
        "date_range": str(r["date"]),
        "fajr": r["jf"],
        "dhuhr": r["jd"],
        "asr": r["ja"],
        "maghrib": r["jm"],
        "isha": r["ji"],
    } for r in rows]
    fri = next((r for r in rows if r["weekday"] in ("FRI",)), None)
    jummah = fri["jd"] if fri else ""
    return {
        "month": None,
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def main() -> None:
    src_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)

    file_map = {
        "jan": "JANUARY", "feb": "FEBRUARY", "mar": "MARCH", "apr": "APRIL",
        "may": "MAY", "jun": "JUNE", "jul": "JULY", "aug": "AUGUST",
        "sep": "SEPTEMBER", "oct": "OCTOBER", "nov": "NOVEMBER", "dec": "DECEMBER",
    }
    found = {m: False for m in MONTHS}
    for txt in sorted(src_dir.glob("*.txt")):
        stem = txt.stem.lower()
        month_name = next((v for k, v in file_map.items() if stem.startswith(k)), None)
        if month_name is None:
            continue
        data = parse_month(txt.read_text().splitlines())
        if data is None:
            print(f"  SKIP {month_name}: no rows")
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
