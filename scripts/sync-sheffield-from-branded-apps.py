#!/usr/bin/env python3
"""Sync Sheffield mosques from their dedicated official apps.

The mosque's own branded app is the authoritative source for its published
timetable. Each app stores the Firestore timetable in AsyncStorage under
`prayer_times_<subdomain>`; long values live in a side file named md5(key).

Usage:
    python3 scripts/sync-sheffield-from-branded-apps.py --print
    python3 scripts/sync-sheffield-from-branded-apps.py --write

Per-cell guards
---------------
The branded apps share a backend, and it carries defects. A cell is only taken
from the app when it passes every check below; otherwise the existing repo
value is kept and a warning printed. No time is ever computed.

  * iqamah before its own adhan
  * maghrib iqamah more than MAX_MAGHRIB_IQAMAH_GAP after maghrib (the August
    Quba failure, where the column held the Isha time)
  * sunrise less than MIN_FAJR_SUNRISE_GAP after fajr
  * blank/None values

Whole-month guard: UK DST
-------------------------
On the clock-change days the whole day must step by the right amount. Two apps
have this wrong for a full month:

  * `awqat` (Masjid Risalah) never applies the 25 Oct BST->GMT change, so its
    entire late-October block is an hour out.
  * `emaantrust` (Sheffield Grand Mosque) never applies the 29 Mar GMT->BST
    change in March.

When a month's boundary step disagrees with the repo the whole month is skipped
for the adhan fields, rather than writing 30 days of wrong clock time.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

MAX_MAGHRIB_IQAMAH_GAP = 15
MIN_FAJR_SUNRISE_GAP = 50
DST_STEP_TOLERANCE = 5  # minutes either side of 60

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

HOME = Path.home()

# (subdomain, bundle id, repo mosque id)
APPS = [
    ("alrahman", "net.apptimist.alrahman", "al-rahman-mosque"),
    ("fpcc", "net.Apptimist.FirthPark", "firth-park-cultural-centre"),
    ("awqat", "net.Apptimist.MosqueApp", "masjid-risalah"),
    ("emaantrust", "net.Apptimist.EmaanTrust", "sheffield-grand-mosque"),
    ("ummahcenter", "com.ummah.center", "sheffield-ummah-center"),
]

ADHAN = [
    ("fajr", "fajr"),
    ("sunrise", "shurooq"),
    ("dhuhur", "dhuhr"),
    ("asr", "asr"),
    ("maghrib", "maghrib"),
    ("isha", "isha"),
]
IQAMAH = [
    ("fajr_iqamah", "fajr"),
    ("dhuhur_iqamah", "dhuhr"),
    ("asr_iqamah", "asr"),
    ("maghrib_iqamah", "maghrib"),
    ("isha_iqamah", "isha"),
]

# UK clock changes in 2026: BST begins 29 Mar, ends 25 Oct.
DST_TRANSITIONS = [
    ("march", 28, 29, "spring"),
    ("october", 24, 25, "autumn"),
]


def to_min(value: str) -> int | None:
    if not isinstance(value, str):
        return None
    try:
        h, m = value.split(":")
        return int(h) * 60 + int(m)
    except ValueError:
        return None


def store_dir(bundle_id: str) -> Path | None:
    d = (
        HOME
        / "Library/Containers"
        / bundle_id
        / "Data/Library/Application Support"
        / bundle_id
        / "RCTAsyncLocalStorage_V1"
    )
    return d if (d / "manifest.json").exists() else None


def load_app(subdomain: str, bundle_id: str) -> dict:
    d = store_dir(bundle_id)
    if d is None:
        raise SystemExit(f"{bundle_id}: no local store. Open the app once, then retry.")
    key = f"prayer_times_{subdomain}"
    manifest = json.loads((d / "manifest.json").read_text())
    if isinstance(manifest.get(key), str):
        payload = json.loads(manifest[key])
    else:
        path = d / hashlib.md5(key.encode()).hexdigest()
        if not path.exists():
            raise SystemExit(f"{bundle_id}: {key} never fetched. Open the app.")
        payload = json.loads(path.read_text())
    data = payload["data"]
    # The cache can hold this year followed by next year in the same array.
    return {
        mon: [r for r in rows if str(r.get("Date", "")).endswith("/2026")]
        for mon, rows in data.items()
        if isinstance(rows, list)
    }


def cell_problem(row: dict, field: str) -> str | None:
    """Return why this app cell is unusable, else None."""
    val = row.get(field)
    if val in (None, ""):
        return "blank"
    if field.startswith("maghrib_iqamah"):
        a, i = to_min(row.get("maghrib")), to_min(val)
        if a is not None and i is not None and i - a > MAX_MAGHRIB_IQAMAH_GAP:
            return f"maghrib iqamah {val} is {i - a} min after maghrib (looks like Isha)"
    if field == "isha_iqamah":
        a, i = to_min(row.get("isha")), to_min(val)
        if a is not None and i is not None and i < a:
            return f"isha iqamah {val} precedes isha adhan {row.get('isha')}"
    if field.startswith("fajr_iqamah"):
        a, i = to_min(row.get("fajr")), to_min(val)
        if a is not None and i is not None and i < a:
            return f"fajr iqamah {val} precedes fajr adhan {row.get('fajr')}"
    if field == "sunrise":
        a, i = to_min(row.get("fajr")), to_min(val)
        if a is not None and i is not None and i - a < MIN_FAJR_SUNRISE_GAP:
            return f"sunrise {val} only {i - a} min after fajr"
    return None


def dst_ok(app_rows: dict[str, dict], repo_rows: dict[int, dict]) -> tuple[bool, str]:
    """Check the app's DST boundary step matches the repo's for this month."""
    for mon, d1, d2, label in DST_TRANSITIONS:
        a1, a2 = app_rows.get(d1), app_rows.get(d2)
        r1, r2 = repo_rows.get(d1), repo_rows.get(d2)
        if not (a1 and a2 and r1 and r2):
            continue
        for app_key, repo_key in (("dhuhur", "dhuhr"), ("fajr", "fajr"), ("maghrib", "maghrib")):
            av, rv = to_min(a1.get(app_key)), to_min(a2.get(app_key))
            r1v, r2v = to_min(r1.get(repo_key)), to_min(r2.get(repo_key))
            if None in (av, rv, r1v, r2v):
                continue
            astep, rstep = rv - av, r2v - r1v
            if abs(astep - rstep) > DST_STEP_TOLERANCE:
                return False, (
                    f"{label} DST: app steps {astep:+d} min at {mon} {d1}->{d2} "
                    f"on {repo_key}, repo steps {rstep:+d}"
                )
    return True, ""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--print", dest="dry", action="store_true")
    args = ap.parse_args()

    root = Path(
        subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    )

    grand_written = grand_kept = 0

    for subdomain, bundle_id, mosque_id in APPS:
        out_dir = root / "public/data/mosques/gb/sheffield" / mosque_id
        if not out_dir.exists():
            print(f"{mosque_id}: no repo directory, skipping\n")
            continue
        print(f"===== {mosque_id}  (app {subdomain}) =====")
        app = load_app(subdomain, bundle_id)
        written = kept = 0

        for month in MONTHS:
            path = out_dir / f"{month}.json"
            if not path.exists():
                continue
            doc = json.loads(path.read_text())
            rows = app.get(month, [])
            if len(rows) != len(doc["prayer_times"]):
                print(f"  {month}: day count {len(rows)} vs {len(doc['prayer_times'])}, skipped")
                continue

            app_by_day = {int(r["Date"][:2]): r for r in rows}
            repo_by_day = {r["date"]: r for r in doc["prayer_times"]}
            adhan_ok, why = dst_ok(app_by_day, repo_by_day)

            # iqamah rows may be one-per-day ("12") or a weekly range ("1-10").
            def iqamah_index_for(day: int) -> int | None:
                for i, row in enumerate(doc["iqamah_times"]):
                    span = str(row.get("date_range", ""))
                    try:
                        if "-" in span:
                            lo, hi = span.split("-")
                            if int(lo) <= day <= int(hi):
                                return i
                        elif int(span) == day:
                            return i
                    except ValueError:
                        continue
                return None

            changes = []
            for idx, app_row in enumerate(rows):
                day = idx + 1
                rp = doc["prayer_times"][idx]
                ri_idx = iqamah_index_for(day)
                ri = doc["iqamah_times"][ri_idx] if ri_idx is not None else None

                for app_key, repo_key in ADHAN:
                    new, old = app_row.get(app_key), rp.get(repo_key)
                    if new == old:
                        continue
                    if not adhan_ok:
                        kept += 1
                        continue
                    problem = cell_problem(app_row, app_key)
                    if problem:
                        print(f"  KEEP {month} day {day} {repo_key}: {problem}")
                        kept += 1
                        continue
                    changes.append((f"prayer_times[{idx}].{repo_key}", old, new))
                    rp[repo_key] = new

                if ri is None:
                    continue
                for app_key, repo_key in IQAMAH:
                    new, old = app_row.get(app_key), ri.get(repo_key)
                    if new == old:
                        continue
                    # A range row covers several days; only write if every day
                    # in the span agrees on the app's value.
                    span = str(ri.get("date_range", ""))
                    days_in_span = (
                        [int(x) for x in span.split("-")]
                        if "-" in span
                        else [int(span)]
                    )
                    lo, hi = min(days_in_span), max(days_in_span)
                    app_vals = {
                        rows[d - 1].get(app_key)
                        for d in range(lo, hi + 1)
                        if d - 1 < len(rows)
                    }
                    if len(app_vals) != 1:
                        print(
                            f"  KEEP {month} {span} iqamah {repo_key}: app varies "
                            f"across the range"
                        )
                        kept += 1
                        continue
                    problem = cell_problem(app_row, app_key)
                    if problem:
                        print(f"  KEEP {month} {span} iqamah {repo_key}: {problem}")
                        kept += 1
                        continue
                    changes.append((f"iqamah_times[{ri_idx}].{repo_key}", old, new))
                    ri[repo_key] = new

            if not adhan_ok:
                print(f"  SKIP {month} adhan — {why}")

            # Jumu'ah: every branded app reports one flat value for the whole
            # year (e.g. 12:30 in June, before dhuhr). Stale placeholder, never synced.
            jum = {r.get("jumah_prayer") for r in rows if r.get("jumah_prayer")}
            if len(jum) == 1 and next(iter(jum)) != doc.get("jummah_iqamah"):
                print(
                    f"  KEEP {month} jummah_iqamah: repo {doc.get('jummah_iqamah')}, "
                    f"app {next(iter(jum))} (flat placeholder — not synced)"
                )
                kept += 1

            if changes:
                print(f"  {month}: {len(changes)} cell(s)")
                written += len(changes)
                if args.write:
                    path.write_text(json.dumps(doc, indent=2) + "\n")

        grand_written += written
        grand_kept += kept
        print(f"  -> {written} cell(s){', written' if args.write else ' (dry run)'}; {kept} kept\n")

    print(
        f"{'Wrote' if args.write else 'Would write'} {grand_written} cell(s); "
        f"kept {grand_kept} repo value(s) for app defects."
    )
    if not args.write:
        print("Re-run with --write to apply.")


if __name__ == "__main__":
    main()
