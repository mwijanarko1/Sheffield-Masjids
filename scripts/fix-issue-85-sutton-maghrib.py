#!/usr/bin/env python3
"""Fix Sutton Coldfield Oct 2026 maghrib adhan/iqamah to match official PDF.

Source: https://suttoncoldfieldmasjid.org/api/timetable/pdf?month=2026-10
Official maghrib Start/Jama'ah for days 18-31 are each +1 minute vs prior static.
November PDF is not published (404) — do not invent november.json.
"""
from __future__ import annotations

import json
from pathlib import Path

PATH = (
    Path(__file__).resolve().parents[1]
    / "public/data/mosques/gb/sutton-coldfield/sutton-coldfield-masjid/october.json"
)

# date -> (maghrib_adhan, maghrib_iqamah) from official October 2026 PDF
OFFICIAL_MAGHRIB = {
    18: ("18:08", "18:11"),
    19: ("18:06", "18:09"),
    20: ("18:04", "18:07"),
    21: ("18:01", "18:04"),
    22: ("17:59", "18:02"),
    23: ("17:57", "18:00"),
    24: ("17:55", "17:58"),
    25: ("16:53", "16:56"),
    26: ("16:51", "16:54"),
    27: ("16:49", "16:52"),
    28: ("16:47", "16:50"),
    29: ("16:45", "16:48"),
    30: ("16:43", "16:46"),
    31: ("16:41", "16:44"),
}


def main() -> None:
    data = json.loads(PATH.read_text())
    changes: list[str] = []

    for row in data["prayer_times"]:
        day = row["date"]
        if day not in OFFICIAL_MAGHRIB:
            continue
        want, _ = OFFICIAL_MAGHRIB[day]
        if row.get("maghrib") != want:
            changes.append(f"day {day} maghrib {row.get('maghrib')} -> {want}")
            row["maghrib"] = want

    for row in data["iqamah_times"]:
        key = row["date_range"]
        if "-" in key:
            continue
        day = int(key)
        if day not in OFFICIAL_MAGHRIB:
            continue
        _, want = OFFICIAL_MAGHRIB[day]
        if row.get("maghrib") != want:
            changes.append(f"day {day} iq.maghrib {row.get('maghrib')} -> {want}")
            row["maghrib"] = want

    if changes:
        PATH.write_text(json.dumps(data, indent=2) + "\n")
    print(f"changed={len(changes)}")
    for line in changes:
        print(line)


if __name__ == "__main__":
    main()
