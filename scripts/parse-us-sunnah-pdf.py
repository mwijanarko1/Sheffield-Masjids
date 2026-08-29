#!/usr/bin/env python3
"""Parse Masjid-us-Sunnah (Leicester) monthly prayer-time PDFs (pdftotext -layout).

Layout: each day spans TWO lines:
  line1: Day Date  Fajr Sunrise Dhuhr Asr1 Asr2 Mag Isha   [Fajr iqamah]
  line2: (indented)  [Dhuhr iqamah] [Asr iqamah] [Mag iqamah] [Isha iqamah]

Columns (beginning): Fajr, Sunrise, Dhuhr, Asr 1, Asr 2, Maghrib, Isha.
Iqamah columns: Fajr, Dhuhr, Asr, Maghrib, Isha (some months omit some).
Uses 24h HH:MM (some times like "1:30" are pm -> 13:30).
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

DAY_RE = re.compile(
    r"^\s*([A-Z][a-z]{2})\s+(\d{1,2})\s+"
    r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+"
    r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s*"
    r"(?:(\d{1,2}:\d{2}))?\s*$"  # trailing Fajr iqamah (optional)
)

# Measured iqamah column anchors across all months (see parser notes):
#   dhuhr=82, asr=88, fajr=91, maghrib=93 (winter) | 111 (summer), isha=119
IQ_ANCHORS = [(82, "dhuhr"), (88, "asr"), (91, "fajr"), (93, "maghrib"), (111, "maghrib"), (119, "isha")]

TIME_ANY = re.compile(r"(\d{1,2}:\d{2})")


def times_with_pos(line: str) -> list[tuple[int, str]]:
    """Return [(col, time)] for each HH:MM in a line."""
    return [(m.start(), m.group(1)) for m in TIME_ANY.finditer(line)]


def assign_iqamah(values: list[tuple[int, str]]) -> dict:
    """Assign (col,time) pairs to the nearest iqamah column anchor."""
    out = {"fajr": "", "dhuhr": "", "asr": "", "maghrib": "", "isha": ""}
    for col, t in values:
        best = min(IQ_ANCHORS, key=lambda a: abs(a[0] - col))
        if not out[best[1]]:
            out[best[1]] = t
    return out


def to24_am(t: str) -> str:
    """'6:34' -> '06:34' (AM time)."""
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


def to24_pm(t: str) -> str:
    """'1:30' -> '13:30', '10:32' -> '22:32', '12:30' -> '12:30' (PM, 12h)."""
    h, m = t.split(":")
    hh = int(h)
    if 1 <= hh <= 11:
        hh += 12
    return f"{hh:02d}:{m}"


def to24_dhuhr(t: str) -> str:
    """Dhuhr: '11:58' -> '11:58', '1:13' -> '13:13', '12:13' -> '12:13'."""
    h, m = t.split(":")
    hh = int(h)
    if 1 <= hh <= 9:
        hh += 12
    return f"{hh:02d}:{m}"


def parse_month(lines: list[str]) -> dict | None:
    rows = []
    i = 0
    while i < len(lines):
        m = DAY_RE.match(lines[i])
        if not m:
            i += 1
            continue
        wd, date, fajr, sunrise, dhuhr, asr1, asr2, mag, isha = m.groups()[:9]
        # Collect all iqamah values (col,time) from day line tail + continuation lines
        iq_pos = []
        # day line: only the trailing Fajr iqamah (col 91); adhan cols end at ~85
        for col, t in times_with_pos(lines[i]):
            if col >= 85:
                iq_pos.append((col, t))
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if DAY_RE.match(nxt):
                break
            vals = times_with_pos(nxt)
            if not vals:
                j += 1
                continue
            iq_vals = [(c, t) for c, t in vals if c >= 75]
            if not iq_vals:
                break
            iq_pos.extend(iq_vals)
            j += 1
        i = j
        iq = assign_iqamah(iq_pos)
        rows.append({
            "date": int(date),
            "weekday": wd,
            "fajr": to24_am(fajr),
            "shurooq": to24_am(sunrise),
            "dhuhr": to24_dhuhr(dhuhr),
            "asr": to24_pm(asr1),
            "asr_mithl2": to24_pm(asr2),
            "maghrib": to24_pm(mag),
            "isha": to24_pm(isha),
            "iq": iq,
        })
    if not rows:
        return None
    rows.sort(key=lambda r: r["date"])
    prayer_times = [{k: r[k] for k in ("date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")} | (
        {"asr_mithl2": r["asr_mithl2"]} if r["asr_mithl2"] else {}
    ) for r in rows]
    iqamah_times = []
    for r in rows:
        iq = r["iq"]
        if not all(iq[k] for k in ("fajr", "dhuhr", "asr", "isha")):
            continue
        iqamah_times.append({
            "date_range": str(r["date"]),
            "fajr": to24_am(iq["fajr"]),
            "dhuhr": to24_dhuhr(iq["dhuhr"]),
            "asr": to24_pm(iq["asr"]),
            "maghrib": to24_pm(iq["maghrib"]) if iq["maghrib"] else to24_pm(r["maghrib"]),
            "isha": to24_pm(iq["isha"]),
        })
    fri = next((r for r in rows if r["weekday"] == "Fri"), None)
    jummah = ""
    if fri and fri["iq"]["dhuhr"]:
        jummah = to24_dhuhr(fri["iq"]["dhuhr"])
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
        print(f"  Wrote {path} ({len(data['prayer_times'])} days, iqamah rows {len(data['iqamah_times'])}, jummah {data['jummah_iqamah']})")
        found[month_name] = True

    missing = [m for m in MONTHS if not found[m]]
    if missing:
        print(f"MISSING: {', '.join(missing)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
