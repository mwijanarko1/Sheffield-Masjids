#!/usr/bin/env python3
"""Build September 2026 JSON from vision-transcribed PDF tables (ICSA + MCC)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def to_24h_afternoon(hhmm: str) -> str:
    h, m = map(int, hhmm.split(":"))
    if h < 12:
        h += 12
    return f"{h:02d}:{m:02d}"


def ampm_to_24h(text: str) -> str:
    dt = datetime.strptime(text.strip().upper(), "%I:%M %p")
    return dt.strftime("%H:%M")


def add_minutes(hhmm: str, minutes: int) -> str:
    dt = datetime.strptime(hhmm, "%H:%M") + timedelta(minutes=minutes)
    return dt.strftime("%H:%M")


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def build_icsa() -> None:
    # Vision source: /tmp/pdf_vision_pages/icsa/page-1.png
    raw = [
        (1, "06:06", "07:11", "01:35", "05:08", "07:57", "09:04"),
        (2, "06:07", "07:12", "01:35", "05:08", "07:56", "09:02"),
        (3, "06:07", "07:13", "01:34", "05:07", "07:54", "09:01"),
        (4, "06:08", "07:13", "01:34", "05:07", "07:53", "09:00"),
        (5, "06:08", "07:14", "01:34", "05:06", "07:52", "08:59"),
        (6, "06:09", "07:14", "01:33", "05:05", "07:51", "08:57"),
        (7, "06:10", "07:15", "01:33", "05:05", "07:50", "08:56"),
        (8, "06:10", "07:15", "01:32", "05:04", "07:48", "08:55"),
        (9, "06:11", "07:16", "01:32", "05:04", "07:47", "08:53"),
        (10, "06:12", "07:16", "01:32", "05:03", "07:46", "08:52"),
        (11, "06:12", "07:17", "01:31", "05:02", "07:45", "08:51"),
        (12, "06:13", "07:17", "01:31", "05:02", "07:44", "08:49"),
        (13, "06:13", "07:18", "01:31", "05:01", "07:42", "08:48"),
        (14, "06:14", "07:18", "01:30", "05:00", "07:41", "08:47"),
        (15, "06:15", "07:19", "01:30", "05:00", "07:40", "08:45"),
        (16, "06:15", "07:19", "01:30", "04:59", "07:39", "08:44"),
        (17, "06:16", "07:20", "01:29", "04:58", "07:37", "08:43"),
        (18, "06:16", "07:20", "01:29", "04:58", "07:36", "08:42"),
        (19, "06:17", "07:21", "01:29", "04:57", "07:35", "08:40"),
        (20, "06:17", "07:21", "01:28", "04:56", "07:34", "08:39"),
        (21, "06:18", "07:22", "01:28", "04:55", "07:32", "08:38"),
        (22, "06:19", "07:22", "01:28", "04:55", "07:31", "08:36"),
        (23, "06:19", "07:23", "01:27", "04:54", "07:30", "08:35"),
        (24, "06:20", "07:23", "01:27", "04:53", "07:29", "08:34"),
        (25, "06:20", "07:24", "01:26", "04:52", "07:28", "08:33"),
        (26, "06:21", "07:24", "01:26", "04:52", "07:26", "08:31"),
        (27, "06:21", "07:25", "01:26", "04:51", "07:25", "08:30"),
        (28, "06:22", "07:26", "01:25", "04:50", "07:24", "08:29"),
        (29, "06:22", "07:26", "01:25", "04:49", "07:23", "08:28"),
        (30, "06:23", "07:27", "01:25", "04:49", "07:22", "08:27"),
    ]

    prayer_times = []
    iqamah_times = []
    for day, fajr, shurooq, dhuhr, asr, maghrib, isha in raw:
        maghrib_24 = to_24h_afternoon(maghrib)
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr,
                "shurooq": shurooq,
                "dhuhr": to_24h_afternoon(dhuhr),
                "asr": to_24h_afternoon(asr),
                "maghrib": maghrib_24,
                "isha": to_24h_afternoon(isha),
            }
        )
        if day <= 15:
            iq = {
                "date_range": str(day),
                "fajr": ampm_to_24h("6:30 AM"),
                "dhuhr": ampm_to_24h("2:10 PM"),
                "asr": ampm_to_24h("5:30 PM"),
                "maghrib": add_minutes(maghrib_24, 10),
                "isha": ampm_to_24h("9:15 PM"),
            }
        else:
            iq = {
                "date_range": str(day),
                "fajr": ampm_to_24h("6:50 AM"),
                "dhuhr": ampm_to_24h("2:10 PM"),
                "asr": ampm_to_24h("5:15 PM"),
                "maghrib": add_minutes(maghrib_24, 10),
                "isha": ampm_to_24h("9:00 PM"),
            }
        iqamah_times.append(iq)

    out = {
        "month": "SEPTEMBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": "12:30",
    }
    write_json(
        ROOT / "public/data/mosques/us/san-antonio/islamic-center-san-antonio/september.json",
        out,
    )


def build_mcc() -> None:
    # Vision source: /tmp/pdf_vision_pages/mcc/page-1.png (+ table crops)
    # MCC column maghrib used; MCC jamaat sidebar.
    raw = [
        (1, "4:56 AM", "6:15 AM", "12:51 PM", "5:29 PM", "7:27 PM", "8:44 PM"),
        (2, "4:57 AM", "6:16 AM", "12:51 PM", "5:28 PM", "7:26 PM", "8:42 PM"),
        (3, "4:58 AM", "6:17 AM", "12:50 PM", "5:27 PM", "7:24 PM", "8:40 PM"),
        (4, "5:00 AM", "6:18 AM", "12:50 PM", "5:25 PM", "7:22 PM", "8:38 PM"),
        (5, "5:01 AM", "6:19 AM", "12:50 PM", "5:24 PM", "7:20 PM", "8:37 PM"),
        (6, "5:02 AM", "6:20 AM", "12:49 PM", "5:23 PM", "7:19 PM", "8:35 PM"),
        (7, "5:04 AM", "6:21 AM", "12:49 PM", "5:21 PM", "7:17 PM", "8:33 PM"),
        (8, "5:05 AM", "6:22 AM", "12:49 PM", "5:20 PM", "7:15 PM", "8:31 PM"),
        (9, "5:06 AM", "6:23 AM", "12:48 PM", "5:19 PM", "7:14 PM", "8:29 PM"),
        (10, "5:07 AM", "6:24 AM", "12:48 PM", "5:17 PM", "7:12 PM", "8:27 PM"),
        (11, "5:08 AM", "6:26 AM", "12:48 PM", "5:16 PM", "7:10 PM", "8:25 PM"),
        (12, "5:10 AM", "6:27 AM", "12:47 PM", "5:14 PM", "7:08 PM", "8:23 PM"),
        (13, "5:11 AM", "6:28 AM", "12:47 PM", "5:13 PM", "7:07 PM", "8:21 PM"),
        (14, "5:12 AM", "6:29 AM", "12:47 PM", "5:12 PM", "7:05 PM", "8:19 PM"),
        (15, "5:13 AM", "6:30 AM", "12:46 PM", "5:10 PM", "7:03 PM", "8:17 PM"),
        (16, "5:14 AM", "6:31 AM", "12:46 PM", "5:09 PM", "7:01 PM", "8:15 PM"),
        (17, "5:16 AM", "6:32 AM", "12:45 PM", "5:07 PM", "7:00 PM", "8:14 PM"),
        (18, "5:17 AM", "6:33 AM", "12:45 PM", "5:06 PM", "6:58 PM", "8:12 PM"),
        (19, "5:18 AM", "6:34 AM", "12:45 PM", "5:04 PM", "6:56 PM", "8:10 PM"),
        (20, "5:19 AM", "6:35 AM", "12:44 PM", "5:03 PM", "6:54 PM", "8:08 PM"),
        (21, "5:20 AM", "6:36 AM", "12:44 PM", "5:01 PM", "6:53 PM", "8:06 PM"),
        (22, "5:21 AM", "6:37 AM", "12:44 PM", "5:00 PM", "6:51 PM", "8:04 PM"),
        (23, "5:23 AM", "6:38 AM", "12:43 PM", "4:58 PM", "6:49 PM", "8:02 PM"),
        (24, "5:24 AM", "6:39 AM", "12:43 PM", "4:57 PM", "6:47 PM", "8:01 PM"),
        (25, "5:25 AM", "6:40 AM", "12:43 PM", "4:55 PM", "6:46 PM", "7:59 PM"),
        (26, "5:26 AM", "6:41 AM", "12:42 PM", "4:54 PM", "6:44 PM", "7:57 PM"),
        (27, "5:27 AM", "6:42 AM", "12:42 PM", "4:52 PM", "6:42 PM", "7:55 PM"),
        (28, "5:28 AM", "6:43 AM", "12:42 PM", "4:51 PM", "6:40 PM", "7:53 PM"),
        (29, "5:29 AM", "6:44 AM", "12:41 PM", "4:49 PM", "6:39 PM", "7:52 PM"),
        (30, "5:30 AM", "6:45 AM", "12:41 PM", "4:48 PM", "6:37 PM", "7:50 PM"),
    ]

    prayer_times = []
    iqamah_times = []
    for day, fajr, shurooq, dhuhr, asr, maghrib, isha in raw:
        maghrib_24 = ampm_to_24h(maghrib)
        prayer_times.append(
            {
                "date": day,
                "fajr": ampm_to_24h(fajr),
                "shurooq": ampm_to_24h(shurooq),
                "dhuhr": ampm_to_24h(dhuhr),
                "asr": ampm_to_24h(asr),
                "maghrib": maghrib_24,
                "isha": ampm_to_24h(isha),
            }
        )
        if day <= 15:
            iq = {
                "date_range": str(day),
                "fajr": ampm_to_24h("5:30 AM"),
                "dhuhr": ampm_to_24h("1:30 PM"),
                "asr": ampm_to_24h("5:45 PM"),
                "maghrib": maghrib_24,
                "isha": ampm_to_24h("9:00 PM"),
            }
        else:
            iq = {
                "date_range": str(day),
                "fajr": ampm_to_24h("5:45 AM"),
                "dhuhr": ampm_to_24h("1:30 PM"),
                "asr": ampm_to_24h("5:30 PM"),
                "maghrib": maghrib_24,
                "isha": ampm_to_24h("8:30 PM"),
            }
        iqamah_times.append(iq)

    out = {
        "month": "SEPTEMBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": "13:05",
    }
    write_json(
        ROOT / "public/data/mosques/us/chicago/muslim-community-center-chicago/september.json",
        out,
    )


def validate(path: Path) -> None:
    data = json.loads(path.read_text())
    days = {row["date"] for row in data["prayer_times"]}
    assert days == set(range(1, 31)), f"{path}: expected 30 days, got {len(days)}"
    for row in data["prayer_times"]:
        d = row["date"]
        times = [row["fajr"], row["shurooq"], row["dhuhr"], row["asr"], row["maghrib"], row["isha"]]
        parsed = [datetime.strptime(t, "%H:%M") for t in times]
        assert parsed == sorted(parsed), f"{path} day {d}: times not ascending"


def main() -> None:
    build_icsa()
    build_mcc()
    validate(ROOT / "public/data/mosques/us/san-antonio/islamic-center-san-antonio/september.json")
    validate(ROOT / "public/data/mosques/us/chicago/muslim-community-center-chicago/september.json")
    print("Wrote ICSA + MCC September 2026 JSON (vision)")


if __name__ == "__main__":
    main()
