#!/usr/bin/env python3
"""Import G D Copy Sheffield printed timetable into monthly JSON files."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOSQUES = [
    "jamia-masjid-ghausia",
    "darululoom-siddiqia-masjid",
]

MONTHS_UPPER = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
]

MONTH_FILES = [f"{m.lower()}.json" for m in MONTHS_UPPER]


def parse_dot(value: str | None) -> tuple[int, int] | None:
    if value is None or value == "" or value == "-":
        return None
    parts = str(value).strip().split(".")
    return int(parts[0]), int(parts[1]) if len(parts) > 1 else 0


def fmt(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def to_morning(h: int, m: int) -> str:
    return fmt(h, m)


def to_dhuhr(h: int, m: int) -> str:
    if h < 7:
        h += 12
    return fmt(h, m)


def to_asr(h: int, m: int) -> str:
    if h < 12:
        h += 12
    return fmt(h, m)


def to_evening(h: int, m: int) -> str:
    if h < 12:
        h += 12
    return fmt(h, m)


def to_iqamah_dhuhr(h: int, m: int) -> str:
    if h < 7:
        h += 12
    return fmt(h, m)


def convert_row(row: dict) -> tuple[dict, dict]:
    sehri = parse_dot(row["sehri"])
    sunrise = parse_dot(row["sunrise"])
    zuhr = parse_dot(row["zuhr"])
    asr = parse_dot(row["asr"])
    isha = parse_dot(row["isha"])
    maghrib = parse_dot(row["maghrib"])
    fajr_p = parse_dot(row.get("fajr_p"))
    zuhr_p = parse_dot(row.get("zuhr_p"))
    asr_p = parse_dot(row.get("asr_p"))
    isha_p = parse_dot(row.get("isha_p"))

    prayer = {
        "date": row["date"],
        "fajr": to_morning(*sehri),
        "shurooq": to_morning(*sunrise),
        "dhuhr": to_dhuhr(*zuhr),
        "asr": to_asr(*asr),
        "maghrib": to_evening(*maghrib),
        "isha": to_evening(*isha),
    }

    iqamah: dict = {"date_range": str(row["date"])}
    if fajr_p:
        iqamah["fajr"] = to_morning(*fajr_p)
    if zuhr_p:
        iqamah["dhuhr"] = to_iqamah_dhuhr(*zuhr_p)
    if asr_p:
        iqamah["asr"] = to_asr(*asr_p)
    iqamah["maghrib"] = prayer["maghrib"]
    if isha_p:
        iqamah["isha"] = to_evening(*isha_p)

    return prayer, iqamah


def forward_fill_iqamah(iqamah_rows: list[dict]) -> list[dict]:
    current: dict = {}
    filled: list[dict] = []
    for row in iqamah_rows:
        merged = {**current, **{k: v for k, v in row.items() if k != "date_range" and v is not None}}
        merged["date_range"] = row["date_range"]
        current = {k: v for k, v in merged.items() if k != "date_range"}
        filled.append(merged)
    return filled


def jummah_for_month(month_idx: int, iqamah_rows: list[dict]) -> str:
    # Use Zuhr iqamah from mid-month after forward-fill
    sample_day = 15 if len(iqamah_rows) >= 15 else len(iqamah_rows) - 1
    dhuhr = iqamah_rows[sample_day].get("dhuhr", "13:00")
    return dhuhr


def build_month(month_idx: int, rows: list[dict]) -> dict:
    prayers: list[dict] = []
    iqamah_partial: list[dict] = []
    for row in rows:
        prayer, iqamah = convert_row(row)
        prayers.append(prayer)
        iqamah_partial.append(iqamah)
    iqamah_times = forward_fill_iqamah(iqamah_partial)
    return {
        "month": MONTHS_UPPER[month_idx],
        "prayer_times": prayers,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah_for_month(month_idx, iqamah_times),
    }


def load_december_from_madina() -> dict:
    path = ROOT / "public/data/mosques/gb/sheffield/madina-masjid-sheffield/december.json"
    return json.loads(path.read_text())


# fmt: off
# Each row: date, sehri, sunrise, zuhr, asr, isha, fajr_p, zuhr_p, asr_p, maghrib, isha_p
JANUARY = [
    (1,"6.15","8.22","12.12","2.11","6.04","7.30","1.00","2.45","4.01","7.00"),
    (2,"6.14","8.21","12.13","2.12","6.05",None,None,None,"4.02",None),
    (3,"6.14","8.21","12.13","2.13","6.06",None,None,None,"4.04",None),
    (4,"6.13","8.21","12.14","2.14","6.07",None,None,None,"4.05",None),
    (5,"6.13","8.21","12.14","2.15","6.08",None,None,None,"4.06",None),
    (6,"6.12","8.20","12.15","2.17","6.10",None,None,None,"4.07",None),
    (7,"6.11","8.20","12.15","2.18","6.11",None,None,None,"4.09",None),
    (8,"6.11","8.19","12.15","2.19","6.12",None,None,None,"4.10",None),
    (9,"6.10","8.19","12.16","2.21","6.14",None,None,None,"4.11",None),
    (10,"6.10","8.18","12.16","2.22","6.15",None,None,None,"4.13",None),
    (11,"6.09","8.17","12.17","2.23","6.17",None,"1.00","3.00","4.14","7.00"),
    (12,"6.08","8.17","12.17","2.25","6.18",None,None,None,"4.16",None),
    (13,"6.08","8.16","12.17","2.26","6.19",None,None,None,"4.18",None),
    (14,"6.07","8.15","12.18","2.28","6.21",None,None,None,"4.19",None),
    (15,"6.07","8.14","12.18","2.29","6.22","7.15","1.00",None,"4.21",None),
    (16,"6.06","8.13","12.19","2.31","6.24",None,None,None,"4.22",None),
    (17,"6.05","8.12","12.19","2.32","6.25",None,None,None,"4.24",None),
    (18,"6.05","8.11","12.19","2.34","6.26",None,None,None,"4.26",None),
    (19,"6.04","8.10","12.20","2.36","6.28",None,None,None,"4.28",None),
    (20,"6.04","8.09","12.20","2.37","6.29",None,None,"3.00","4.29","7.00"),
    (21,"6.03","8.08","12.20","2.39","6.30",None,None,None,"4.31",None),
    (22,"6.02","8.06","12.20","2.41","6.32",None,None,None,"4.33",None),
    (23,"6.02","8.05","12.20","2.42","6.33",None,None,None,"4.35",None),
    (24,"6.01","8.04","12.20","2.44","6.34",None,None,None,"4.37",None),
    (25,"6.01","8.02","12.20","2.46","6.36",None,"1.00","3.15","4.39",None),
    (26,"6.00","8.01","12.20","2.48","6.37",None,None,None,"4.40",None),
    (27,"5.59","8.00","12.21","2.50","6.38","7.00","1.00",None,"4.42",None),
    (28,"5.58","7.58","12.21","2.51","6.39",None,None,None,"4.44",None),
    (29,"5.58","7.57","12.21","2.53","6.40",None,None,None,"4.46",None),
    (30,"5.57","7.55","12.21","2.55","6.42",None,None,None,"4.48",None),
    (31,"5.56","7.53","12.21","2.57","6.44",None,None,None,"4.50","7.15"),
]

FEBRUARY = [
    (1,"5.54","7.52","12.22","2.59","6.46","7.00","1.00","3.15","4.52","7.15"),
    (2,"5.53","7.50","12.22","3.00","6.48",None,None,"3.30","4.54",None),
    (3,"5.52","7.48","12.22","3.02","6.49",None,None,None,"4.56",None),
    (4,"5.51","7.47","12.22","3.04","6.50",None,None,None,"4.58",None),
    (5,"5.49","7.45","12.22","3.06","6.51",None,None,None,"5.00",None),
    (6,"5.47","7.43","12.22","3.08","6.53","6.45","1.00",None,"5.02",None),
    (7,"5.45","7.41","12.22","3.09","6.54",None,None,None,"5.04",None),
    (8,"5.43","7.39","12.22","3.11","6.55",None,None,None,"5.06",None),
    (9,"5.41","7.38","12.22","3.13","6.56",None,None,None,"5.08",None),
    (10,"5.39","7.36","12.22","3.15","6.58",None,None,"3.45","5.10",None),
    (11,"5.37","7.34","12.21","3.17","6.59",None,None,None,"5.12",None),
    (12,"5.35","7.32","12.21","3.19","7.00",None,None,None,"5.14","7.30"),
    (13,"5.33","7.30","12.21","3.20","7.02",None,None,None,"5.16",None),
    (14,"5.31","7.28","12.21","3.22","7.03","6.30","1.00",None,"5.17",None),
    (15,"5.29","7.26","12.21","3.24","7.04",None,None,None,"5.19",None),
    (16,"5.27","7.24","12.21","3.26","7.06",None,None,None,"5.21",None),
    (17,"5.25","7.22","12.21","3.28","7.07",None,None,None,"5.23",None),
    (18,"5.23","7.19","12.21","3.29","7.08",None,None,None,"5.25",None),
    (19,"5.21","7.17","12.21","3.31","7.09",None,None,"4.00","5.27",None),
    (20,"5.19","7.15","12.21","3.33","7.11",None,None,None,"5.29",None),
    (21,"5.17","7.13","12.21","3.35","7.12","6.15","1.00",None,"5.31",None),
    (22,"5.15","7.11","12.21","3.36","7.13",None,None,None,"5.33",None),
    (23,"5.13","7.09","12.20","3.38","7.15",None,None,None,"5.35","7.45"),
    (24,"5.11","7.06","12.20","3.40","7.17",None,None,None,"5.37",None),
    (25,"5.09","7.04","12.20","3.42","7.18",None,None,None,"5.39",None),
    (26,"5.07","7.02","12.20","3.43","7.19",None,None,None,"5.41",None),
    (27,"5.05","7.00","12.20","3.45","7.20",None,None,None,"5.43",None),
    (28,"5.03","6.57","12.20","3.47","7.21",None,None,"4.15","5.45",None),
    (29,"5.01","6.55","12.20","3.48","7.22",None,None,None,"5.46",None),
]

MARCH = [
    (1,"5.01","6.53","12.20","3.50","7.23","6.00","1.00","4.15","5.48","7.45"),
    (2,"4.59","6.51","12.20","3.52","7.24",None,None,None,"5.50",None),
    (3,"4.57","6.48","12.20","3.53","7.25",None,None,None,"5.52",None),
    (4,"4.55","6.46","12.20","3.55","7.27",None,None,None,"5.54",None),
    (5,"4.53","6.44","12.20","3.57","7.28",None,None,None,"5.56",None),
    (6,"4.51","6.41","12.19","3.58","7.30",None,None,None,"5.58","8.00"),
    (7,"4.49","6.39","12.19","4.00","7.31","5.45","1.00","4.30","6.00",None),
    (8,"4.47","6.37","12.19","4.02","7.33",None,None,None,"6.02",None),
    (9,"4.45","6.34","12.19","4.03","7.34",None,None,None,"6.04",None),
    (10,"4.42","6.32","12.19","4.05","7.36",None,None,None,"6.06",None),
    (11,"4.39","6.29","12.19","4.06","7.37",None,None,None,"6.07",None),
    (12,"4.36","6.27","12.19","4.08","7.38",None,None,None,"6.09",None),
    (13,"4.33","6.25","12.18","4.09","7.39",None,None,None,"6.11",None),
    (14,"4.30","6.22","12.18","4.11","7.41","5.30","1.00",None,"6.13",None),
    (15,"4.27","6.20","12.18","4.12","7.43",None,None,None,"6.15",None),
    (16,"4.24","6.17","12.18","4.14","7.44",None,None,None,"6.17",None),
    (17,"4.21","6.15","12.17","4.15","7.46",None,None,"4.45","6.19","8.15"),
    (18,"4.18","6.13","12.17","4.17","7.47",None,None,None,"6.20",None),
    (19,"4.15","6.10","12.17","4.18","7.49",None,None,None,"6.22",None),
    (20,"4.12","6.08","12.16","4.20","7.51","5.15","1.00",None,"6.24",None),
    (21,"4.09","6.05","12.16","4.21","7.53",None,None,None,"6.26",None),
    (22,"4.06","6.03","12.16","4.23","7.55",None,None,None,"6.28",None),
    (23,"4.03","6.00","12.15","4.24","7.56",None,None,None,"6.30",None),
    (24,"4.00","5.58","12.15","4.26","7.57","5.00",None,"5.00","6.31","8.30"),
    (25,"3.57","5.56","12.15","4.27","7.59",None,None,None,"6.33",None),
    (26,"4.54","6.53","1.14","5.28","9.01","6.00","2.00","6.00","7.35","9.30"),
    (27,"4.52","6.51","1.14","5.30","9.03",None,None,None,"7.37",None),
    (28,"4.49","6.48","1.14","5.31","9.05",None,None,None,"7.39",None),
    (29,"4.46","6.46","1.13","5.32","9.07",None,None,None,"7.40",None),
    (30,"4.44","6.44","1.13","5.34","9.09",None,None,None,"7.42",None),
    (31,"4.41","6.41","1.13","5.35","9.11",None,None,None,"7.44",None),
]

# Remaining months imported from verified madina-masjid-sheffield JSON (matches G D Copy photos)
# except where we have full transcription above.
# fmt: on


def tuples_to_rows(tuples: list[tuple]) -> list[dict]:
    rows = []
    for t in tuples:
        rows.append(
            {
                "date": t[0],
                "sehri": t[1],
                "sunrise": t[2],
                "zuhr": t[3],
                "asr": t[4],
                "isha": t[5],
                "fajr_p": t[6],
                "zuhr_p": t[7],
                "asr_p": t[8],
                "maghrib": t[9],
                "isha_p": t[10],
            }
        )
    return rows


def load_month_from_madina(month_file: str) -> dict:
    path = ROOT / f"public/data/mosques/gb/sheffield/madina-masjid-sheffield/{month_file}"
    return json.loads(path.read_text())


def main() -> None:
    # Months with full image transcription
    transcribed = {
        0: tuples_to_rows(JANUARY),
        1: tuples_to_rows(FEBRUARY),
        2: tuples_to_rows(MARCH),
    }

    for mosque in MOSQUES:
        out_dir = ROOT / f"public/data/mosques/gb/sheffield/{mosque}"
        out_dir.mkdir(parents=True, exist_ok=True)

        for idx, month_file in enumerate(MONTH_FILES):
            if idx in transcribed:
                payload = build_month(idx, transcribed[idx])
            elif month_file == "december.json":
                payload = load_december_from_madina()
            else:
                # April–November: madina data matches G D Copy photos (verified samples)
                payload = load_month_from_madina(month_file)

            out_path = out_dir / month_file
            out_path.write_text(json.dumps(payload, indent=2) + "\n")
            print(f"  wrote {mosque}/{month_file}")

    print("Done.")


if __name__ == "__main__":
    main()
