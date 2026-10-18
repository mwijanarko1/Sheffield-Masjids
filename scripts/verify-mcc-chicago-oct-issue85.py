#!/usr/bin/env python3
"""Verify MCC Chicago october.json against Oct2026-PTT.pdf vision transcription.

Only rewrites file if mismatch found. Uses MCC (not MEC) Maghrib / Isha bands.
"""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path("public/data/mosques/us/chicago/muslim-community-center-chicago/october.json")

# Jamaat bands from PDF sidebar (MCC column)
# Oct 1-15 / Oct 16-30 (day 31 continues second band — only published jamaat bands)
BANDS = [
    (1, 15, {"fajr": "06:00", "dhuhr": "13:30", "asr": "17:00", "isha": "20:00"}),
    (16, 31, {"fajr": "06:15", "dhuhr": "13:30", "asr": "16:45", "isha": "19:30"}),
]
JUMMAH = "13:05"


def band_for(day: int) -> dict[str, str]:
    for a, b, band in BANDS:
        if a <= day <= b:
            return band
    raise KeyError(day)


def main() -> None:
    data = json.loads(OUT.read_text())
    mismatches = []
    for iq in data["iqamah_times"]:
        day = int(iq["date_range"].split("-")[0]) if "-" in iq["date_range"] else int(iq["date_range"])
        # expand check per date_range end if needed — file is daily
        expected = band_for(int(str(iq["date_range"]).split("-")[0]))
        # maghrib = sunset/adhan
        pt = next(p for p in data["prayer_times"] if p["date"] == int(str(iq["date_range"]).split("-")[0]))
        for key in ("fajr", "dhuhr", "asr", "isha"):
            if iq.get(key) != expected[key]:
                mismatches.append((iq["date_range"], key, iq.get(key), expected[key]))
        if iq.get("maghrib") != pt["maghrib"]:
            mismatches.append((iq["date_range"], "maghrib", iq.get("maghrib"), pt["maghrib"]))

    print(f"iqamah mismatches vs PDF bands: {len(mismatches)}")
    for row in mismatches[:30]:
        print(" ", row)

    # Spot-check a few adhan times from PDF description
    checks = {
        1: {"fajr": "05:32", "shurooq": "06:47", "dhuhr": "12:41", "asr": "16:46", "maghrib": "18:35", "isha": "19:48"},
        18: {"fajr": "05:50", "dhuhr": "12:36", "asr": "16:21", "maghrib": "18:07", "isha": "19:20"},
        31: {"fajr": "06:04", "dhuhr": "12:35", "asr": "16:04", "maghrib": "17:49", "isha": "19:03"},
    }
    by = {p["date"]: p for p in data["prayer_times"]}
    adhan_miss = []
    for day, exp in checks.items():
        pt = by[day]
        for k, v in exp.items():
            if pt.get(k) != v:
                adhan_miss.append((day, k, pt.get(k), v))
    print(f"adhan spot mismatches: {len(adhan_miss)}")
    for row in adhan_miss:
        print(" ", row)

    if data.get("jummah_iqamah") != JUMMAH:
        print("jummah mismatch", data.get("jummah_iqamah"), "vs", JUMMAH)

    if not mismatches and not adhan_miss and data.get("jummah_iqamah") == JUMMAH:
        print("MCC Chicago October matches PDF — no write needed")
        return

    # Rebuild iqamah from bands if needed; keep adhan as-is unless spot checks fail badly
    if mismatches:
        new_iq = []
        for pt in sorted(data["prayer_times"], key=lambda x: x["date"]):
            b = band_for(pt["date"])
            new_iq.append(
                {
                    "date_range": str(pt["date"]),
                    "fajr": b["fajr"],
                    "dhuhr": b["dhuhr"],
                    "asr": b["asr"],
                    "maghrib": pt["maghrib"],
                    "isha": b["isha"],
                }
            )
        data["iqamah_times"] = new_iq
        data["jummah_iqamah"] = JUMMAH
        OUT.write_text(json.dumps(data, indent=2) + "\n")
        print("rewrote iqamah_times from PDF bands")
    elif data.get("jummah_iqamah") != JUMMAH:
        data["jummah_iqamah"] = JUMMAH
        OUT.write_text(json.dumps(data, indent=2) + "\n")
        print("fixed jummah only")


if __name__ == "__main__":
    main()
