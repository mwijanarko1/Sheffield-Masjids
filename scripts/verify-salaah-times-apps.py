#!/usr/bin/env python3
"""Verify Batley / Dewsbury / Scunthorpe monthly JSON against the live feeds.

Read-only. Reuses the mapping and time normalisation from
`extract-salaah-times-apps.py` so the checker and the writer cannot drift.

    python3 scripts/verify-salaah-times-apps.py --months 10,11
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques" / "gb"

_spec = importlib.util.spec_from_file_location(
    "salaah_times_apps", ROOT / "scripts" / "extract-salaah-times-apps.py"
)
ext = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ext)

ADHAN_FIELDS = [("fajr", "fajr"), ("sunrise", "shurooq"), ("dhuhr", "dhuhr"),
                ("asr", "asr"), ("maghrib", "maghrib"), ("isha", "isha")]
IQAMAH_FIELDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
REQUIRED = {name for name, _ in ADHAN_FIELDS}


def compare_city_feed(city: str, slug: str, month: int, schedule: dict, problems: list[str]) -> None:
    label = f"{city}/{slug} {ext.MONTH_UPPER[month]}"
    path = DATA / city / slug / f"{ext.MONTH_FILE[month]}.json"
    if not path.exists():
        print(f"  {'NO FILE':9} {label}")
        problems.append(f"{label}: no repo file")
        return

    repo = json.loads(path.read_text())
    adhan = {row["date"]: row for row in repo["prayer_times"]}
    iqamah = {row["date_range"]: row for row in repo["iqamah_times"]}

    diffs: list[str] = []
    partial: list[int] = []
    missing: list[int] = []
    blanks: list[str] = []
    normalised = 0

    for date_key in sorted(schedule):
        day = int(date_key.split("-")[2])
        by_name = {row["prayer_name"].strip().lower(): row for row in schedule[date_key]}
        if not REQUIRED.issubset(by_name):
            partial.append(day)          # Friday-only Dhuhr row
            continue
        row_adhan, row_iqamah = adhan.get(day), iqamah.get(str(day))
        if not row_adhan or not row_iqamah:
            missing.append(day)
            continue

        for source, field in ADHAN_FIELDS:
            api = ext.hhmm(by_name[source]["start_time"])
            if field == "dhuhr":
                fixed = ext.normalize_dhuhr(api)
                normalised += fixed != api
                api = fixed
            if api != row_adhan[field]:
                diffs.append(f"{day}.{field} api={api} repo={row_adhan[field]}")

        for field in IQAMAH_FIELDS:
            api = ext.hhmm(by_name[field]["jamaat_time"])
            current = row_iqamah[field]
            if current == "-":           # repo marks "adhan only, no jamat"
                continue
            if not api:                  # source leaves the jamaat cell blank
                blanks.append(f"{day}.{field} repo={current}")
                continue
            if api != current:
                diffs.append(f"{day}.{field}I api={api} repo={current}")

    status = "OK" if not diffs and not missing else "MISMATCH"
    note = ""
    if partial:
        note += f" src-partial-days={partial}"
    if missing:
        note += f" repo-missing-days={missing}"
    if diffs:
        note += f" diffs={len(diffs)}: " + "; ".join(diffs[:5])
    if blanks:
        note += f" src-blank-iqamah={len(blanks)}"
    if normalised:
        note += f" dhuhr-12h-cells={normalised}"
    print(f"  {status:9} {label}: api={len(schedule)} repo={len(adhan)}{note}")
    if diffs or missing:
        problems.append(f"{label}: {len(diffs)} diffs, {len(missing)} missing days")


def compare_scunthorpe(month: int, year: int, problems: list[str]) -> None:
    label = f"scunthorpe/{ext.SCM_SLUG} {ext.MONTH_UPPER[month]}"
    try:
        rows = ext.fetch_json(
            f"{ext.SCM_DISPLAY_BASE}/monthly?month={month}&year={year}"
        ).get("times") or []
    except Exception as err:  # noqa: BLE001
        print(f"  {'ERROR':9} {label}: {err}")
        problems.append(f"{label}: {err}")
        return
    if not rows:
        print(f"  {'EMPTY':9} {label}: feed publishes nothing")
        return

    path = DATA / ext.SCM_CITY / ext.SCM_SLUG / f"{ext.MONTH_FILE[month]}.json"
    if not path.exists():
        print(f"  {'NO FILE':9} {label}: api={len(rows)}")
        problems.append(f"{label}: no repo file")
        return

    repo = json.loads(path.read_text())
    adhan = {row["date"]: row for row in repo["prayer_times"]}
    iqamah = {row["date_range"]: row for row in repo["iqamah_times"]}

    pairs = [("fajrStart", "fajr"), ("sunrise", "shurooq"), ("dhuhrStart", "dhuhr"),
             ("asrStart", "asr"), ("maghribStart", "maghrib"), ("ishaStart", "isha")]
    iqamah_pairs = [("fajrIqamah", "fajr"), ("dhuhrIqamah", "dhuhr"),
                    ("asrIqamah", "asr"), ("maghribIqamah", "maghrib"),
                    ("ishaIqamah", "isha")]

    diffs: list[str] = []
    missing: list[int] = []
    for row in rows:
        day = int(row["day"])
        row_adhan, row_iqamah = adhan.get(day), iqamah.get(str(day))
        if not row_adhan or not row_iqamah:
            missing.append(day)
            continue
        for source, field in pairs:
            api = ext.hhmm(row.get(source))
            if api and api != row_adhan[field]:
                diffs.append(f"{day}.{field} api={api} repo={row_adhan[field]}")
        for source, field in iqamah_pairs:
            api = ext.hhmm(row.get(source))
            current = row_iqamah[field]
            if not api or current == "-":
                continue
            if api != current:
                diffs.append(f"{day}.{field}I api={api} repo={current}")

    status = "OK" if not diffs and not missing else "MISMATCH"
    note = ""
    if missing:
        note += f" repo-missing-days={missing}"
    if diffs:
        note += f" diffs={len(diffs)}: " + "; ".join(diffs[:5])
    print(f"  {status:9} {label}: api={len(rows)} repo={len(adhan)}{note}")
    if diffs or missing:
        problems.append(f"{label}: {len(diffs)} diffs, {len(missing)} missing days")


def main() -> None:
    today = date.today()
    upcoming = [today.month, today.month % 12 + 1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=today.year)
    parser.add_argument(
        "--months",
        default=",".join(str(m) for m in upcoming),
        help="comma-separated month numbers (default: current + next)",
    )
    args = parser.parse_args()
    months = [int(m) for m in args.months.split(",") if m.strip()]

    problems: list[str] = []
    feeds = [
        ("BATLEY", ext.BATLEY_BASE, ext.rebuild_batley_map),
        ("DEWSBURY", ext.DEWSBURY_BASE, ext.rebuild_dewsbury_map),
    ]

    for month in months:
        print(f"\n===== {args.year}-{month:02d} =====")
        for name, base, rebuild in feeds:
            mapping = rebuild(ext.fetch_json(f"{base}/mosques.php")["data"])
            for mosque_id, (city, slug) in sorted(mapping.items(), key=lambda kv: kv[1]):
                payload = ext.fetch_json(
                    f"{base}/monthly-timetable.php?mosque_id={mosque_id}"
                    f"&month={args.year}-{month:02d}"
                )
                schedule = payload.get("monthly_schedule") or {}
                if not schedule:
                    print(f"  {'EMPTY':9} {name} {city}/{slug} {ext.MONTH_UPPER[month]}")
                    continue
                compare_city_feed(city, slug, month, schedule, problems)
        compare_scunthorpe(month, args.year, problems)

    print("\n===== SUMMARY =====")
    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems:
            print("  -", problem)
        raise SystemExit(1)
    print("All checked mosques match their live feed.")


if __name__ == "__main__":
    main()
