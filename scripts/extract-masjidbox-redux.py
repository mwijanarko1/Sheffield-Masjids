#!/usr/bin/env python3
"""Extract prayer times from MasjidBox public prayer-times page REDUX_STATE (7-day window)."""
import argparse
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
MONTH_FILES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def fetch_redux(slug: str) -> dict:
    url = f"https://masjidbox.com/prayer-times/{slug}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)"})
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    match = re.search(r"REDUX_STATE\s*=\s*'([^']+)'", html)
    if not match:
        raise RuntimeError(f"No REDUX_STATE in {url}")
    return json.loads(unquote(match.group(1)))


def to_hhmm(iso: str) -> str:
    if not iso:
        return ""
    match = re.search(r"T(\d{2}):(\d{2})", iso)
    return f"{match.group(1)}:{match.group(2)}" if match else ""


def build_months(timetable: list[dict]) -> dict[int, dict]:
    by_month: dict[int, dict] = {}
    grouped: dict[int, list] = defaultdict(list)

    for day in timetable:
        date_iso = day["date"]
        y, m, d = [int(x) for x in re.match(r"(\d{4})-(\d{2})-(\d{2})", date_iso).groups()]
        iq = day.get("iqamah") or {}
        grouped[m].append({
            "date": d,
            "fajr": to_hhmm(day.get("fajr")),
            "shurooq": to_hhmm(day.get("sunrise")),
            "dhuhr": to_hhmm(day.get("dhuhr")),
            "asr": to_hhmm(day.get("asr")),
            "maghrib": to_hhmm(day.get("maghrib")),
            "isha": to_hhmm(day.get("isha")),
            "iq_fajr": to_hhmm(iq.get("fajr")),
            "iq_dhuhr": to_hhmm(iq.get("dhuhr")),
            "iq_asr": to_hhmm(iq.get("asr")),
            "iq_maghrib": to_hhmm(iq.get("maghrib")),
            "iq_isha": to_hhmm(iq.get("isha")),
        })

    for month_num, days in grouped.items():
        days.sort(key=lambda x: x["date"])
        prayer_times = []
        iqamah_times = []
        for row in days:
            prayer_times.append({
                "date": row["date"],
                "fajr": row["fajr"],
                "shurooq": row["shurooq"],
                "dhuhr": row["dhuhr"],
                "asr": row["asr"],
                "maghrib": row["maghrib"],
                "isha": row["isha"],
            })
            iqamah_times.append({
                "date_range": str(row["date"]),
                "fajr": row["iq_fajr"] or row["fajr"],
                "dhuhr": row["iq_dhuhr"] or row["dhuhr"],
                "asr": row["iq_asr"] or row["asr"],
                "maghrib": row["iq_maghrib"] or row["maghrib"],
                "isha": row["iq_isha"] or row["isha"],
            })
        by_month[month_num] = {
            "month": MONTH_NAMES[month_num - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": iqamah_times[0]["dhuhr"] if iqamah_times else "",
        }
    return by_month


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract MasjidBox REDUX_STATE timetable")
    parser.add_argument("slug", help="MasjidBox slug (e.g. kurabymosque)")
    parser.add_argument("out_dir", type=Path, help="Output directory for monthly JSON")
    args = parser.parse_args()

    redux = fetch_redux(args.slug)
    timetable = redux["masjidbox"]["masjidboxAthany"]["timetable"]
    if not timetable:
        raise RuntimeError("Empty timetable in REDUX_STATE")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    months = build_months(timetable)
    for month_num, payload in sorted(months.items()):
        out_path = args.out_dir / f"{MONTH_FILES[month_num - 1]}.json"
        out_path.write_text(json.dumps(payload, indent=2) + "\n")
        print(f"Wrote {out_path} ({len(payload['prayer_times'])} days, jummah {payload['jummah_iqamah']})")


if __name__ == "__main__":
    main()
