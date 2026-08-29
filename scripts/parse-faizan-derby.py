#!/usr/bin/env python3
"""Parse Faizan-e-Madinah Derby monthly prayer PDFs (pdftotext -layout).

Columns: Date Day Islamic* | Fajr Start Jamaat | Sunrise | Dhuhr-tul-Kubra
Start Jamaat | Asr Start Jamaat | Maghrib | Isha Start Jamaat.
`"` means "same as previous row" (forward-fill). No maghrib jamaat column.
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
    r"^\s*(\d{1,2})\s+(\S+)\s+(\d{1,2}|[A-Za-z0-9*]+(?:\s+[A-Za-z0-9*]+)?)\s+"
    r"(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+"
    r"(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+"
    r"(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s+"
    r"(\d{1,2}:\d{2}|\")\s+(\d{1,2}:\d{2}|\")\s*$"
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
    prev: dict | None = None
    for line in lines:
        m = ROW_RE.match(line)
        if not m or len(m.groups()) != 14:
            continue
        date, day, _isl, fajr, fajr_j, sunrise, dk, dhuhr_s, dhuhr_j, asr_s, asr_j, mag, isha_s, isha_j = m.groups()

        def resolve(v, key):
            if v == '"':
                return prev[key] if prev and prev[key] else ""
            return v

        row = {
            "date": int(date),
            "weekday": day,
            "fajr": resolve(fajr, "fajr"),
            "fajr_j": resolve(fajr_j, "fajr_j"),
            "sunrise": resolve(sunrise, "sunrise"),
            "dhuhr_s": resolve(dhuhr_s, "dhuhr_s"),
            "dhuhr_j": resolve(dhuhr_j, "dhuhr_j"),
            "asr_s": resolve(asr_s, "asr_s"),
            "asr_j": resolve(asr_j, "asr_j"),
            "mag": resolve(mag, "mag"),
            "isha_s": resolve(isha_s, "isha_s"),
            "isha_j": resolve(isha_j, "isha_j"),
        }
        prev = row
        rows.append(row)
    if not rows:
        return None
    rows.sort(key=lambda r: r["date"])
    prayer_times = [{
        "date": r["date"],
        "fajr": to24_am(r["fajr"]),
        "shurooq": to24_am(r["sunrise"]),
        "dhuhr": to24_dhuhr(r["dhuhr_s"]),
        "asr": to24_pm(r["asr_s"]),
        "maghrib": to24_pm(r["mag"]),
        "isha": to24_pm(r["isha_s"]),
    } for r in rows]
    iqamah_times = [{
        "date_range": str(r["date"]),
        "fajr": to24_am(r["fajr_j"]) if r["fajr_j"] else "",
        "dhuhr": to24_dhuhr(r["dhuhr_j"]) if r["dhuhr_j"] else "",
        "asr": to24_pm(r["asr_j"]) if r["asr_j"] else "",
        "maghrib": to24_pm(r["mag"]) if r["mag"] else "",
        "isha": to24_pm(r["isha_j"]) if r["isha_j"] else "",
    } for r in rows]
    fri = next((r for r in rows if r["weekday"].lower().startswith("fri")), None)
    jummah = to24_dhuhr(fri["dhuhr_j"]) if fri and fri["dhuhr_j"] else ""
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
    found = {m: False for m in MONTHS}
    for txt in sorted(src_dir.glob("*.txt")):
        stem = txt.stem.lower()
        month_name = stem[:3].title() if stem[:3] in {m[:3].lower() for m in MONTHS} else ""
        month_name = next((m for m in MONTHS if m.lower() == stem), None) or \
            next((m for m in MONTHS if m.lower().startswith(stem[:3])), None)
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
    done = [m for m in MONTHS if found[m]]
    missing = [m for m in MONTHS if not found[m]]
    print(f"Done: {len(done)} months. Missing: {', '.join(missing) or 'none'}")
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
