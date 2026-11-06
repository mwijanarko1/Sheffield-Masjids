#!/usr/bin/env python3
"""Sync Masjid Quba Sheffield monthly files from the mosque's official app.

Source of truth: "Masjid Quba Sheffield" (net.apptimist.MasjidQubaSheffield),
the mosque's own white-label app, which stores its published timetable in
AsyncStorage under `prayer_times_masjidquba`.

Usage:
    python3 scripts/sync-quba-from-official-app.py --print          # dry run, show diff
    python3 scripts/sync-quba-from-official-app.py --write          # apply

Design notes
------------
The app is authoritative for what the mosque publishes. But the app's backend
carries a few upstream data defects, and copying those into the repo would
replace one wrong value with another. Each defect class is checked per cell and
the *existing repo value is kept* for that cell only, with a warning:

  * maghrib iqamah more than MAX_MAGHRIB_IQAMAH_GAP after maghrib adhan
    (August 2026 has maghrib_iqamah holding the Isha time, 63-100 min later;
    every other month the gap is a constant +5 min).
  * isha iqamah earlier than isha adhan (14 Sep 2026).
  * sunrise less than MIN_FAJR_SUNRISE_GAP after fajr adhan
    (26/29/30/31 Oct 2026 are 41-43 min, vs ~100+ min normal).

Everything else is taken verbatim from the app. No time is ever computed.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

SLUG = "masjid-quba-education-centre"
CITY = "sheffield"
COUNTRY = "gb"

MONTHS = [
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

# Keys in the app's AsyncStorage that hold the timetable, in priority order.
APP_BUNDLE_ID = "net.apptimist.MasjidQubaSheffield"
FALLBACK_BUNDLE_ID = "com.masjidapp.iphone"

MAX_MAGHRIB_IQAMAH_GAP = 15  # minutes
MIN_FAJR_SUNRISE_GAP = 50  # minutes


def to_min(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def find_app_store() -> Path:
    """Locate the app's AsyncStorage directory."""
    home = Path.home()
    candidates = [
        home
        / "Library/Containers"
        / APP_BUNDLE_ID
        / "Data/Library/Application Support"
        / APP_BUNDLE_ID
        / "RCTAsyncLocalStorage_V1",
        home
        / "Library/Containers"
        / FALLBACK_BUNDLE_ID
        / "Data/Library/Application Support"
        / FALLBACK_BUNDLE_ID
        / "RCTAsyncLocalStorage_V1",
    ]
    for c in candidates:
        if (c / "manifest.json").exists():
            return c
    raise SystemExit(
        "Could not find the Masjid Quba app's local store. Open the app once, then retry."
    )


def load_app_timetable(store: Path) -> dict:
    """Read prayer_times_masjidquba out of AsyncStorage.

    React Native stores long values in separate files named md5(key); short
    values stay inline in manifest.json.
    """
    manifest = json.loads((store / "manifest.json").read_text())
    key = "prayer_times_masjidquba"

    if key in manifest and isinstance(manifest[key], str):
        return json.loads(manifest[key])["data"]

    import hashlib

    fn = hashlib.md5(key.encode()).hexdigest()
    path = store / fn
    if not path.exists():
        raise SystemExit(
            f"{key} not found in the app store ({path}). Open the app so it fetches the timetable."
        )
    return json.loads(path.read_text())["data"]


def check_cell(month: str, day: int, row: dict, field: str) -> str | None:
    """Return a reason string if THIS cell is unusable, else None."""
    if field == "maghrib" and "maghrib" in row and "maghrib_iqamah" in row:
        gap = to_min(row["maghrib_iqamah"]) - to_min(row["maghrib"])
        if gap > MAX_MAGHRIB_IQAMAH_GAP:
            return (
                f"maghrib iqamah {row['maghrib_iqamah']} is {gap} min after "
                f"maghrib {row['maghrib']} (looks like the Isha time)"
            )
    if field == "isha" and "isha_iqamah" in row:
        if to_min(row["isha_iqamah"]) < to_min(row["isha"]):
            return (
                f"isha iqamah {row['isha_iqamah']} precedes isha adhan {row['isha']}"
            )
    if field == "shurooq" and "fajr" in row:
        gap = to_min(row["sunrise"]) - to_min(row["fajr"])
        if gap < MIN_FAJR_SUNRISE_GAP:
            return (
                f"sunrise {row['sunrise']} is only {gap} min after fajr {row['fajr']}"
            )
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="apply changes")
    ap.add_argument("--print", dest="dry", action="store_true", help="show diff only")
    args = ap.parse_args()

    root = Path(subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True
    ).stdout.strip())
    out_dir = root / "public/data/mosques" / COUNTRY / CITY / SLUG

    store = find_app_store()
    app = load_app_timetable(store)
    print(f"app store : {store}")
    print(f"repo dir  : {out_dir}\n")

    adhan_map = [
        ("fajr", "fajr"),
        ("sunrise", "shurooq"),
        ("dhuhur", "dhuhr"),
        ("asr", "asr"),
        ("maghrib", "maghrib"),
        ("isha", "isha"),
    ]
    iqamah_map = [
        ("fajr_iqamah", "fajr"),
        ("dhuhur_iqamah", "dhuhr"),
        ("asr_iqamah", "asr"),
        ("maghrib_iqamah", "maghrib"),
        ("isha_iqamah", "isha"),
    ]

    total_written = 0
    total_kept = 0

    for month in MONTHS:
        path = out_dir / f"{month}.json"
        if not path.exists():
            print(f"{month}: no repo file, skipping")
            continue
        doc = json.loads(path.read_text())
        app_rows = app[month]

        if len(app_rows) != len(doc["prayer_times"]):
            print(
                f"{month}: day count differs "
                f"(app {len(app_rows)} vs repo {len(doc['prayer_times'])}), skipping"
            )
            continue

        changes = []
        for idx, app_row in enumerate(app_rows):
            repo_prayer = doc["prayer_times"][idx]
            repo_iqamah = doc["iqamah_times"][idx]

            for app_key, repo_key in adhan_map:
                new_val = app_row.get(app_key)
                old_val = repo_prayer.get(repo_key)
                if not new_val or new_val == old_val:
                    continue
                reason = check_cell(month, idx + 1, app_row, repo_key)
                if reason:
                    print(f"  KEEP {month} day {idx + 1} {repo_key}: {reason}")
                    total_kept += 1
                    continue
                changes.append((f"prayer_times[{idx}].{repo_key}", old_val, new_val))
                repo_prayer[repo_key] = new_val

            for app_key, repo_key in iqamah_map:
                new_val = app_row.get(app_key)
                old_val = repo_iqamah.get(repo_key)
                if not new_val or new_val == old_val:
                    continue
                reason = check_cell(month, idx + 1, app_row, repo_key)
                if reason:
                    print(f"  KEEP {month} day {idx + 1} iqamah {repo_key}: {reason}")
                    total_kept += 1
                    continue
                changes.append((f"iqamah_times[{idx}].{repo_key}", old_val, new_val))
                repo_iqamah[repo_key] = new_val

        # Jumu'ah is deliberately NOT synced from the app.
        #
        # The app reports a flat `jumah_prayer` of 12:30 for every month. In
        # June/July that falls *before* the dhuhr adhan (~13:10), which is
        # impossible, so the field is a stale placeholder rather than a
        # published Friday time. In March it happens to be technically valid
        # but still contradicts the mosque's own dhuhr iqamah (12:45) on some
        # Fridays. Syncing it would introduce a new error in winter to fix
        # nothing, so the repo value is always kept and the difference reported.
        jum = {r.get("jumah_prayer") for r in app_rows if r.get("jumah_prayer")}
        if len(jum) == 1:
            app_jum = next(iter(jum))
            old_jum = doc.get("jummah_iqamah")
            if app_jum != old_jum:
                impossible = any(
                    to_min(app_jum) < to_min(r["dhuhur"])
                    for r in app_rows
                    if r.get("jumah_prayer")
                )
                why = (
                    "precedes dhuhr adhan on some Fridays"
                    if impossible
                    else "flat all-year placeholder"
                )
                print(
                    f"  KEEP {month} jummah_iqamah: repo {old_jum}, app {app_jum} "
                    f"({why} — not synced)"
                )
                total_kept += 1

        if not changes:
            print(f"{month}: already in sync ({len(app_rows)} days)")
            continue

        print(f"{month}: {len(changes)} cell(s)")
        for where, old, new in changes:
            print(f"    {where}: {old} -> {new}")
        total_written += len(changes)

        if args.write:
            path.write_text(json.dumps(doc, indent=2) + "\n")
            print(f"    wrote {path.relative_to(root)}")

    print(f"\n{'Wrote' if args.write else 'Would write'} {total_written} cell(s); kept {total_kept} repo value(s) for app defects.")
    if not args.write:
        print("Re-run with --write to apply.")


if __name__ == "__main__":
    main()
