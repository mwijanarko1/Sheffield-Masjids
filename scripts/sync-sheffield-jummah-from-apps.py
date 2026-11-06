#!/usr/bin/env python3
"""Sync jummah_iqamah for the six Sheffield mosques from their branded apps.

The mosque's own app is the source of truth for its published times, including
Jumu'ah. Each app carries `jumah_prayer` on the Friday rows; we take the single
value it reports and apply it to every month of that mosque's files.

Usage:
    python3 scripts/sync-sheffield-jummah-from-apps.py --print
    python3 scripts/sync-sheffield-jummah-from-apps.py --write

Caveat, deliberately surfaced rather than enforced
--------------------------------------------------
The app reports one flat value for all 12 months. In summer, Dhuhr adhan moves
to ~13:05-13:15 (BST), so a flat 12:15-13:00 Jumu'ah lands *before* Dhuhr on
49 mosque-months across the six. That is physically impossible — Jumu'ah is
prayed at or after Dhuhr — but it is what the app publishes.

This script applies the app value as instructed and prints every affected
month so the monthly review has a concrete checklist. It does not silently
"fix" them, because inventing a Jumu'ah time is worse than carrying the app's.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

HOME = Path.home()

# repo mosque id -> (bundle id, app subdomain)
APPS = {
    "masjid-risalah": ("net.Apptimist.MosqueApp", "awqat"),
    "al-rahman-mosque": ("net.apptimist.alrahman", "alrahman"),
    "sheffield-grand-mosque": ("net.Apptimist.EmaanTrust", "emaantrust"),
    "firth-park-cultural-centre": ("net.Apptimist.FirthPark", "fpcc"),
    "masjid-quba-education-centre": ("net.apptimist.MasjidQubaSheffield", "masjidquba"),
    "sheffield-ummah-center": ("com.ummah.center", "ummahcenter"),
}

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


def to_min(v: str) -> int:
    h, m = v.split(":")
    return int(h) * 60 + int(m)


def store_dir(bundle_id: str) -> Path:
    d = (
        HOME
        / "Library/Containers"
        / bundle_id
        / "Data/Library/Application Support"
        / bundle_id
        / "RCTAsyncLocalStorage_V1"
    )
    if not (d / "manifest.json").exists():
        raise SystemExit(f"{bundle_id}: no local store. Open the app once, then retry.")
    return d


def app_jumuah(bundle_id: str, subdomain: str) -> str:
    d = store_dir(bundle_id)
    key = f"prayer_times_{subdomain}"
    manifest = json.loads((d / "manifest.json").read_text())
    if isinstance(manifest.get(key), str):
        payload = json.loads(manifest[key])
    else:
        path = d / hashlib.md5(key.encode()).hexdigest()
        if not path.exists():
            raise SystemExit(f"{bundle_id}: {key} never fetched. Open the app.")
        payload = json.loads(path.read_text())
    values = set()
    for rows in payload["data"].values():
        if not isinstance(rows, list):
            continue
        for r in rows:
            if str(r.get("Date", "")).endswith("/2026") and r.get("jumah_prayer"):
                values.add(r["jumah_prayer"])
    if len(values) != 1:
        raise SystemExit(f"{subdomain}: expected one jumah_prayer, got {sorted(values)}")
    return values.pop()


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

    total = 0
    impossible: list[tuple[str, str, str, str]] = []

    for mosque_id, (bundle_id, subdomain) in APPS.items():
        out_dir = root / "public/data/mosques/gb/sheffield" / mosque_id
        if not out_dir.exists():
            continue
        new = app_jumuah(bundle_id, subdomain)
        print(f"\n== {mosque_id}  (app {subdomain}) -> {new}")
        changed = 0
        for month in MONTHS:
            path = out_dir / f"{month}.json"
            if not path.exists():
                continue
            doc = json.loads(path.read_text())
            old = doc.get("jummah_iqamah")
            if old == new:
                continue
            changed += 1
            print(f"   {month:10s} {old} -> {new}")
            if doc.get("prayer_times"):
                latest = max(to_min(r["dhuhr"]) for r in doc["prayer_times"])
                if to_min(new) < latest:
                    impossible.append(
                        (
                            mosque_id,
                            month,
                            new,
                            f"{latest // 60:02d}:{latest % 60:02d}",
                        )
                    )
            doc["jummah_iqamah"] = new
            if args.write:
                path.write_text(json.dumps(doc, indent=2) + "\n")
        total += changed
        if not changed:
            print("   already in sync")

    print(f"\n{'Wrote' if args.write else 'Would write'} {total} month(s).")

    if impossible:
        print("\n!!! Jumu'ah precedes Dhuhr adhan in these months (app value applied):")
        for mosque_id, month, jum, latest in impossible:
            print(f"    {mosque_id:30s} {month:10s} jumah {jum} < dhuhr adhan {latest}")
        print(f"    {len(impossible)} month(s) need checking against the mosque's real Jumu'ah.")

    if not args.write:
        print("\nRe-run with --write to apply.")


if __name__ == "__main__":
    main()
