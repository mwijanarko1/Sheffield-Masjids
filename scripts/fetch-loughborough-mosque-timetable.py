#!/usr/bin/env python3
"""Extract Loughborough Mosque 2026 timetable from official PDF."""

from __future__ import annotations

import json
import re
import subprocess
import urllib.request
from pathlib import Path

PDF_URL = (
    "https://lboromasjid.co.uk/wp-content/uploads/2025/12/"
    "Loughborough-mosque-2026-prayer-time-table_comp.pdf"
)
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/data/mosques/gb/loughborough/loughborough-mosque"

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [m.lower() for m in MONTH_NAMES]

DAY_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
DAY_START = re.compile(r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\b")
DAY_ONLY = re.compile(r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*$")
DATE_ONLY = re.compile(r"^\s*(\d{1,2})\s*$")
TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")
MONTH_HEADER = re.compile(r"PRAYER TIMETABLE - (\w+) 20\d{2}", re.I)
FOOTER = re.compile(
    r"Loughborough Mosque & Islamic Cultural Association, 85 King Street",
    re.I,
)


def to24h(h: int, m: int, slot: int) -> str:
    hour = h
    if slot <= 2:
        if hour == 12:
            hour = 0
    elif slot <= 4:
        if hour != 12 and hour < 8:
            hour += 12
    elif slot <= 6:
        if hour < 8:
            hour += 12
    else:
        if hour < 12:
            hour += 12
    return f"{hour:02d}:{m:02d}"


def parse_times(fragment: str) -> list[tuple[int, int]]:
    times = []
    for match in TIME_RE.finditer(fragment):
        times.append((int(match.group(1)), int(match.group(2))))
        if len(times) >= 10:
            break
    return times


def slots_from_times(times: list[tuple[int, int]]) -> dict[str, str]:
    keys = [
        "fajr", "fajr_j", "sunrise", "zuhr", "zuhr_j",
        "asr", "asr_j", "maghrib", "isha", "isha_j",
    ]
    out: dict[str, str] = {k: "" for k in keys}
    # Map extracted time count -> slot indices (PDF omits empty jama'at cells)
    by_len: dict[int, list[int]] = {
        10: list(range(10)),
        9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        8: [0, 1, 2, 3, 4, 5, 7, 8],
        7: [0, 1, 2, 3, 5, 7, 8],
        6: [0, 2, 3, 5, 7, 8],  # adhan-only weekdays
        5: [0, 2, 3, 5, 8],  # missing maghrib cell in PDF layout
    }
    map_idx = by_len.get(len(times))
    if map_idx is None:
        map_idx = list(range(min(len(times), 10)))
    for i, (h, m) in enumerate(times[: len(map_idx)]):
        out[keys[map_idx[i]]] = to24h(h, m, map_idx[i])
    return out


def fill_jamah(days: list[dict]) -> None:
    last = {"fajr_j": "", "zuhr_j": "", "asr_j": "", "isha_j": ""}
    for d in days:
        for k in last:
            if d[k]:
                last[k] = d[k]
            elif last[k]:
                d[k] = last[k]
        if not d["maghrib_j"] and d["maghrib"]:
            d["maghrib_j"] = d["maghrib"]


def _normalize_split_time_lines(time_lines: list[str], n: int) -> list[str]:
    """Merge consecutive single-time lines into one row (PDF stacks one time per day per line)."""
    normalized: list[str] = []
    pending: list[tuple[int, int]] = []

    def flush_pending() -> None:
        if pending:
            normalized.append(
                " ".join(f"{h}:{m:02d}" for h, m in pending)
            )
            pending.clear()

    for tline in time_lines:
        times = parse_times(tline)
        if n > 1 and len(times) == 1:
            pending.append(times[0])
            if len(pending) == n:
                flush_pending()
        else:
            flush_pending()
            normalized.append(tline)
    flush_pending()
    return normalized


def _assign_split_block_times(
    weekdays: list[str], dates: list[str], time_lines: list[str]
) -> list[str]:
    """Build pseudo-rows from column-stacked PDF cells (e.g. Tue/Wed 20/21)."""
    n = len(weekdays)
    if n == 0 or len(dates) < n:
        return []

    time_lines = _normalize_split_time_lines(time_lines, n)

    # Six adhan slots per day: fajr, sunrise, zuhr, asr, maghrib, isha
    grid: list[list[tuple[int, int] | None]] = [
        [None] * 6 for _ in range(n)
    ]
    slot = 0

    for tline in time_lines:
        times = parse_times(tline)
        if not times:
            continue
        if len(times) == n:
            for d, t in enumerate(times):
                if slot < 6:
                    grid[d][slot] = t
            slot += 1
        elif len(times) == 2 * n:
            for d in range(n):
                if slot < 6:
                    grid[d][slot] = times[2 * d]
                if slot + 1 < 6:
                    grid[d][slot + 1] = times[2 * d + 1]
            slot += 2
        else:
            # Fallback: sequential fill
            idx = 0
            for d in range(n):
                for s in range(6):
                    if idx < len(times) and grid[d][s] is None:
                        grid[d][s] = times[idx]
                        idx += 1

    rows: list[str] = []
    for d, day_name in enumerate(weekdays):
        date = dates[d] if d < len(dates) else ""
        if not date:
            continue
        parts = []
        for t in grid[d]:
            if t:
                parts.append(f"{t[0]}:{t[1]:02d}")
        rows.append(f"{day_name} {date} {' '.join(parts)}")
    return rows


def merge_split_rows(lines: list[str]) -> list[str]:
    """Reconstruct rows broken across lines (e.g. Tue/Wed 20/21)."""
    merged: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if DAY_ONLY.match(line.strip()):
            weekdays = [line.strip()]
            i += 1
            while i < len(lines) and DAY_ONLY.match(lines[i].strip()):
                weekdays.append(lines[i].strip())
                i += 1
            dates: list[str] = []
            while i < len(lines) and DATE_ONLY.match(lines[i]):
                dates.append(DATE_ONLY.match(lines[i]).group(1))  # type: ignore
                i += 1
            time_lines: list[str] = []
            while i < len(lines) and TIME_RE.search(lines[i]) and not DAY_START.match(
                lines[i].strip()
            ):
                time_lines.append(lines[i].strip())
                i += 1
            merged.extend(_assign_split_block_times(weekdays, dates, time_lines))
            continue

        if DAY_START.match(line.strip()):
            merged.append(line.strip())
        i += 1
    return merged


def parse_month_body(body: str) -> list[dict]:
    lines = []
    for raw in body.split("\n"):
        t = raw.strip()
        if not t:
            continue
        if t.startswith("PRAYER TIMETABLE") or t.startswith("Day "):
            continue
        if t.startswith("Fajr ") or "PLEASE DONATE" in t:
            continue
        if FOOTER.search(t):
            break
        lines.append(raw)

    rows = merge_split_rows(lines)
    days: list[dict] = []

    for row in rows:
        m = DAY_START.match(row)
        if not m:
            continue
        date = int(m.group(2))
        times = parse_times(row[m.end() :])
        if len(times) < 5:
            continue
        s = slots_from_times(times)
        days.append(
            {
                "date": date,
                "weekday": m.group(1),
                "fajr": s["fajr"],
                "shurooq": s["sunrise"],
                "dhuhr": s["zuhr"],
                "asr": s["asr"],
                "maghrib": s["maghrib"],
                "isha": s["isha"],
                "fajr_j": s["fajr_j"],
                "zuhr_j": s["zuhr_j"],
                "asr_j": s["asr_j"],
                "maghrib_j": s["maghrib"],
                "isha_j": s["isha_j"],
            }
        )

    days.sort(key=lambda d: d["date"])
    fill_jamah(days)
    # Fill maghrib when PDF layout dropped the athaan cell
    for i, d in enumerate(days):
        if d["maghrib"]:
            continue
        for neighbor in (days[i - 1] if i > 0 else None, days[i + 1] if i + 1 < len(days) else None):
            if neighbor and neighbor["maghrib"]:
                d["maghrib"] = neighbor["maghrib"]
                d["maghrib_j"] = neighbor["maghrib_j"]
                break
    return days


def group_iqamah(days: list[dict]) -> list[dict]:
    ranges: list[dict] = []
    start = None
    prev_key = None
    prev = None

    for day in days:
        key = "|".join(
            day[k] for k in ("fajr_j", "zuhr_j", "asr_j", "maghrib_j", "isha_j")
        )
        if prev_key is not None and key != prev_key:
            end = day["date"] - 1
            ranges.append(
                {
                    "date_range": str(start) if start == end else f"{start}-{end}",
                    "fajr": prev["fajr_j"],
                    "dhuhr": prev["zuhr_j"],
                    "asr": prev["asr_j"],
                    "maghrib": prev["maghrib_j"],
                    "isha": prev["isha_j"],
                }
            )
            start = day["date"]
        elif prev_key is None:
            start = day["date"]
        prev_key = key
        prev = day

    if prev:
        end = prev["date"]
        ranges.append(
            {
                "date_range": str(start) if start == end else f"{start}-{end}",
                "fajr": prev["fajr_j"],
                "dhuhr": prev["zuhr_j"],
                "asr": prev["asr_j"],
                "maghrib": prev["maghrib_j"],
                "isha": prev["isha_j"],
            }
        )
    return ranges


def to_json(month: str, days: list[dict]) -> dict:
    fri = next((d for d in days if d["weekday"] == "Fri"), None)
    return {
        "month": month,
        "prayer_times": [
            {
                "date": d["date"],
                "fajr": d["fajr"],
                "shurooq": d["shurooq"],
                "dhuhr": d["dhuhr"],
                "asr": d["asr"],
                "maghrib": d["maghrib"],
                "isha": d["isha"],
            }
            for d in days
        ],
        "iqamah_times": group_iqamah(days),
        "jummah_iqamah": (fri or days[0])["zuhr_j"] or "13:30",
    }


def extract_pdf_text() -> str:
    pdf = Path("/tmp/lboro-2026.pdf")
    txt = Path("/tmp/lboro-2026.txt")
    urllib.request.urlretrieve(PDF_URL, pdf)
    subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=True)
    return txt.read_text(encoding="utf-8", errors="replace")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = extract_pdf_text()
    parts = MONTH_HEADER.split(text)
    names = MONTH_HEADER.findall(text)

    if len(names) != 12:
        raise SystemExit(f"Expected 12 months, found {len(names)}: {names}")

    for i, month_name in enumerate(names):
        month = month_name.upper()
        body = parts[2 * i + 2]
        days = parse_month_body(body)
        expected = 31 if month in ("JANUARY", "MARCH", "MAY", "JULY", "AUGUST", "OCTOBER", "DECEMBER") else 30
        if month == "FEBRUARY":
            expected = 28
        if len(days) < expected - 2:
            raise SystemExit(f"{month}: only {len(days)} days parsed (expected ~{expected})")

        out_path = OUT_DIR / f"{MONTH_FILES[MONTH_NAMES.index(month)]}.json"
        out_path.write_text(json.dumps(to_json(month, days), separators=(",", ":")))
        print(f"{month}: {len(days)} days -> {out_path}")

    may_idx = MONTH_NAMES.index("MAY")
    may = parse_month_body(parts[2 * may_idx + 2])
    d31 = next(d for d in may if d["date"] == 31)
    checks = {
        "fajr": "02:44",
        "shurooq": "04:47",
        "dhuhr": "13:09",
        "asr": "18:38",
        "maghrib": "21:21",
        "isha": "22:22",
        "fajr_j": "04:00",
        "asr_j": "19:00",
        "isha_j": "22:40",
    }
    for field, expected in checks.items():
        assert d31[field] == expected, f"May 31 {field}: got {d31[field]!r}, want {expected}"
    print("\nMay 31 spot-check OK. Done.")


if __name__ == "__main__":
    main()
