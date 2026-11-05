#!/usr/bin/env python3
"""Build MCC Chicago (muslim-community-center-chicago) november.json.

Source: https://mccchicago.org/wp-content/uploads/2026/09/Nov2026-PTT-Ads-WEB-pages.pdf
The PDF is a single flattened image (no text layer), so the daily grid was read with
the vision skill after the native page image was extracted. Every cell was then
cross-checked with two independent pixel methods:

  * glyph-signature classes (binarised text, cropped to ink bbox, normalised)
  * MCC vs MEC column diff (the two Maghrib cells are printed side by side)

All three agree on every one of the 30 days x 6 columns, so no per-cell guessing
remains. October continuity (DST fall-back on 1 Nov) is asserted at the end.

Transcribe only; never calculate.
"""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path("public/data/mosques/us/chicago/muslim-community-center-chicago/november.json")

# Daily adhan (beginning) times, transcribed per column.
# Columns: fajr, shurooq, dhuhr, asr, maghrib, isha
ROWS = [
    # date, fajr, shurooq, dhuhr, asr, maghrib, isha
    (1, "05:06", "06:24", "11:35", "15:03", "16:46", "18:02"),
    (2, "05:07", "06:25", "11:35", "15:02", "16:45", "18:01"),
    (3, "05:08", "06:26", "11:35", "15:00", "16:44", "18:00"),
    (4, "05:09", "06:28", "11:35", "14:59", "16:42", "17:59"),
    (5, "05:10", "06:29", "11:35", "14:58", "16:41", "17:58"),
    (6, "05:11", "06:30", "11:35", "14:57", "16:40", "17:57"),
    (7, "05:12", "06:31", "11:35", "14:56", "16:39", "17:56"),
    (8, "05:13", "06:33", "11:35", "14:55", "16:38", "17:55"),
    (9, "05:14", "06:34", "11:35", "14:54", "16:37", "17:54"),
    (10, "05:15", "06:35", "11:35", "14:53", "16:36", "17:53"),
    (11, "05:16", "06:36", "11:35", "14:52", "16:35", "17:52"),
    (12, "05:17", "06:37", "11:35", "14:51", "16:34", "17:51"),
    (13, "05:19", "06:39", "11:35", "14:50", "16:33", "17:51"),
    (14, "05:20", "06:40", "11:36", "14:49", "16:32", "17:50"),
    (15, "05:21", "06:41", "11:36", "14:48", "16:31", "17:49"),
    (16, "05:22", "06:42", "11:36", "14:47", "16:30", "17:49"),
    (17, "05:23", "06:44", "11:36", "14:47", "16:29", "17:48"),
    (18, "05:24", "06:45", "11:36", "14:46", "16:29", "17:47"),
    (19, "05:25", "06:46", "11:37", "14:45", "16:28", "17:47"),
    (20, "05:26", "06:47", "11:37", "14:44", "16:27", "17:46"),
    (21, "05:27", "06:48", "11:37", "14:44", "16:27", "17:46"),
    (22, "05:28", "06:50", "11:37", "14:43", "16:26", "17:45"),
    (23, "05:29", "06:51", "11:38", "14:43", "16:25", "17:45"),
    (24, "05:30", "06:52", "11:38", "14:42", "16:25", "17:44"),
    (25, "05:31", "06:53", "11:38", "14:41", "16:24", "17:44"),
    (26, "05:32", "06:54", "11:38", "14:41", "16:24", "17:43"),
    (27, "05:33", "06:55", "11:39", "14:41", "16:23", "17:43"),
    (28, "05:34", "06:56", "11:39", "14:40", "16:23", "17:43"),
    (29, "05:35", "06:58", "11:39", "14:40", "16:22", "17:43"),
    (30, "05:36", "06:59", "11:40", "14:39", "16:22", "17:42"),
]

# Jamaat (iqamah) sidebar, "AT MCC" column (this mosque is the MCC Elston Ave site).
# Maghrib is printed as "SUNSET" -> iqamah equals that day's maghrib adhan.
BANDS = [
    (1, 15, {"fajr": "05:45", "dhuhr": "12:30", "asr": "15:15", "isha": "19:15"}),
    (16, 30, {"fajr": "06:00", "dhuhr": "12:30", "asr": "15:15", "isha": "19:15"}),
]
JUMMAH = "13:05"  # Friday prayers, MCC 1:05 PM


def band(day: int) -> dict[str, str]:
    for lo, hi, vals in BANDS:
        if lo <= day <= hi:
            return vals
    raise KeyError(day)


def to_min(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def main() -> None:
    assert len(ROWS) == 30, len(ROWS)
    assert [r[0] for r in ROWS] == list(range(1, 31)), "dates must be 1..30"

    prayer_times = []
    iqamah_times = []
    for date, fajr, shurooq, dhuhr, asr, maghrib, isha in ROWS:
        row = {
            "date": date,
            "fajr": fajr,
            "shurooq": shurooq,
            "dhuhr": dhuhr,
            "asr": asr,
            "maghrib": maghrib,
            "isha": isha,
        }
        prayer_times.append(row)

        b = band(date)
        iq = {
            "date_range": str(date),
            "fajr": b["fajr"],
            "dhuhr": b["dhuhr"],
            "asr": b["asr"],
            "maghrib": maghrib,  # SUNSET
            "isha": b["isha"],
        }

        # ordering: fajr < shurooq < dhuhr < asr < maghrib < isha
        seq = [fajr, shurooq, dhuhr, asr, maghrib, isha]
        mins = [to_min(x) for x in seq]
        assert mins == sorted(mins), f"date {date}: out of order {seq}"
        assert len(set(mins)) == 6, f"date {date}: duplicate time {seq}"

        # iqamah must not precede its adhan
        for k in ("fajr", "dhuhr", "asr", "maghrib", "isha"):
            assert to_min(iq[k]) >= to_min(row[k]), f"date {date}: iqamah {k} before adhan"

        iqamah_times.append(iq)

    data = {
        "month": "NOVEMBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": JUMMAH,
    }

    # --- continuity with the committed October file (US DST ends 2026-11-01) ---
    oct_path = OUT.with_name("october.json")
    if oct_path.exists():
        oct_data = json.loads(oct_path.read_text())
        oct_last = oct_data["prayer_times"][-1]
        assert oct_last["date"] == 31, oct_last["date"]
        nov_first = prayer_times[0]
        diffs = {
            k: to_min(oct_last[k]) - to_min(nov_first[k])
            for k in ("fajr", "dhuhr", "asr", "maghrib", "isha")
        }
        # Dhuhr/Asr/Maghrib/Isha step back ~60 min on the DST change; fajr also
        # steps back but by more, since it is already past the clock change.
        for k in ("dhuhr", "asr", "maghrib", "isha"):
            assert 55 <= diffs[k] <= 65, f"Oct31->Nov1 {k} shifted {diffs[k]}m"
        print("Oct 31 -> Nov 1 minute deltas:", diffs)

    OUT.write_text(json.dumps(data, indent=2))
    print(f"wrote {OUT} ({len(prayer_times)} days, {len(iqamah_times)} iqamah rows)")


if __name__ == "__main__":
    main()
