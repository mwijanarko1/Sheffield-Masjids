#!/usr/bin/env python3
"""Apply the 50 field/date cells authorised by issue #170.

Sources re-read 5 Nov 2026:
  * ilford-islamic-centre  -> https://masjidbox.com/prayer-times/ilfordmosque (linked by ilfordmosque.com)
  * sultan-bahu-bradford   -> https://masjidbox.com/prayer-times/sultan-bahu-bradford
  * masjid-e-vali          -> official November 2026 PNG (Drive 11YX7tch4vdZd4VwDfj15Hx6UnXxVZBEG)
                              and PDF (Drive 1L5wak_5qMtxyyZSnKogeuNiWaviN8BTO), read visually

Only the exact cells listed in the issue are touched. No other date, field or month changes.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques"

# (repo path, month file, date_range key, iqamah field, new value)
IQAMAH_EDITS = [
    # Ilford Islamic Centre, 2026-11-10 dhuhr iqamah 13:00 -> 13:15
    ("gb/ilford/ilford-islamic-centre", "10", "dhuhr", "13:15"),
    # Sultan Bahu Bradford, 2026-11-10 fajr iqamah 06:00 -> 06:15
    ("gb/bradford/sultan-bahu-bradford", "10", "fajr", "06:15"),
    # Masjid E Vali iqamah cells
    ("gb/blackburn/masjid-e-vali", "4", "dhuhr", "13:30"),
    ("gb/blackburn/masjid-e-vali", "4", "maghrib", "16:37"),
    ("gb/blackburn/masjid-e-vali", "4", "isha", "19:00"),
    ("gb/blackburn/masjid-e-vali", "5", "dhuhr", "13:30"),
    ("gb/blackburn/masjid-e-vali", "5", "maghrib", "16:35"),
    ("gb/blackburn/masjid-e-vali", "5", "isha", "19:00"),
    ("gb/blackburn/masjid-e-vali", "6", "maghrib", "16:33"),
    ("gb/blackburn/masjid-e-vali", "6", "isha", "19:00"),
    ("gb/blackburn/masjid-e-vali", "7", "maghrib", "16:32"),
    ("gb/blackburn/masjid-e-vali", "7", "isha", "18:15"),
    ("gb/blackburn/masjid-e-vali", "8", "maghrib", "16:30"),
    ("gb/blackburn/masjid-e-vali", "9", "maghrib", "16:28"),
    ("gb/blackburn/masjid-e-vali", "9", "isha", "19:00"),
    ("gb/blackburn/masjid-e-vali", "10", "maghrib", "16:26"),
    ("gb/blackburn/masjid-e-vali", "10", "isha", "19:00"),
    ("gb/blackburn/masjid-e-vali", "11", "maghrib", "16:25"),
    ("gb/blackburn/masjid-e-vali", "11", "isha", "19:00"),
]

# (repo path, date, adhan field, new value)
PRAYER_EDITS = [
    ("gb/blackburn/masjid-e-vali", 4, "fajr", "05:34"),
    ("gb/blackburn/masjid-e-vali", 4, "shurooq", "07:14"),
    ("gb/blackburn/masjid-e-vali", 4, "asr", "14:42"),
    ("gb/blackburn/masjid-e-vali", 4, "isha", "18:11"),
    ("gb/blackburn/masjid-e-vali", 5, "fajr", "05:35"),
    ("gb/blackburn/masjid-e-vali", 5, "shurooq", "07:16"),
    ("gb/blackburn/masjid-e-vali", 5, "asr", "14:40"),
    ("gb/blackburn/masjid-e-vali", 5, "isha", "18:10"),
    ("gb/blackburn/masjid-e-vali", 6, "fajr", "05:36"),
    ("gb/blackburn/masjid-e-vali", 6, "shurooq", "07:18"),
    ("gb/blackburn/masjid-e-vali", 6, "asr", "14:38"),
    ("gb/blackburn/masjid-e-vali", 6, "isha", "18:08"),
    ("gb/blackburn/masjid-e-vali", 7, "fajr", "05:38"),
    ("gb/blackburn/masjid-e-vali", 7, "shurooq", "07:20"),
    ("gb/blackburn/masjid-e-vali", 7, "asr", "14:36"),
    ("gb/blackburn/masjid-e-vali", 7, "isha", "18:07"),
    ("gb/blackburn/masjid-e-vali", 8, "fajr", "05:40"),
    ("gb/blackburn/masjid-e-vali", 8, "shurooq", "07:22"),
    ("gb/blackburn/masjid-e-vali", 8, "asr", "14:35"),
    ("gb/blackburn/masjid-e-vali", 8, "isha", "18:05"),
    ("gb/blackburn/masjid-e-vali", 9, "fajr", "05:42"),
    ("gb/blackburn/masjid-e-vali", 9, "shurooq", "07:24"),
    ("gb/blackburn/masjid-e-vali", 9, "asr", "14:33"),
    ("gb/blackburn/masjid-e-vali", 10, "fajr", "05:43"),
    ("gb/blackburn/masjid-e-vali", 10, "shurooq", "07:26"),
    ("gb/blackburn/masjid-e-vali", 10, "asr", "14:32"),
    ("gb/blackburn/masjid-e-vali", 10, "isha", "18:04"),
    ("gb/blackburn/masjid-e-vali", 11, "fajr", "05:44"),
    ("gb/blackburn/masjid-e-vali", 11, "shurooq", "07:28"),
    ("gb/blackburn/masjid-e-vali", 11, "asr", "14:30"),
    ("gb/blackburn/masjid-e-vali", 11, "isha", "18:02"),
]


def load(rel, month):
    path = DATA / rel / f"{month}.json"
    raw = path.read_text()
    return path, json.loads(raw), raw.endswith("\n")


def save(path, data, trailing_newline):
    text = json.dumps(data, indent=2, ensure_ascii=False)
    path.write_text(text + "\n" if trailing_newline else text)


def main():
    changed = 0
    cache = {}

    def get(rel, month):
        key = (rel, month)
        if key not in cache:
            path, data, trailing = load(rel, month)
            cache[key] = (path, data, trailing)
        return cache[key]

    for rel, dr, field, new in IQAMAH_EDITS:
        path, data, _ = get(rel, "november")
        rows = [r for r in data["iqamah_times"] if r["date_range"] == dr]
        if len(rows) != 1:
            raise SystemExit(f"{rel} {dr}: expected 1 iqamah row, found {len(rows)}")
        row = rows[0]
        old = row.get(field)
        if old == new:
            print(f"  = {rel} nov {dr} {field} already {new}")
            continue
        row[field] = new
        changed += 1
        print(f"  * {rel} nov {dr} {field}: {old} -> {new}")

    for rel, date, field, new in PRAYER_EDITS:
        path, data, _ = get(rel, "november")
        rows = [r for r in data["prayer_times"] if r["date"] == date]
        if len(rows) != 1:
            raise SystemExit(f"{rel} {date}: expected 1 prayer row, found {len(rows)}")
        row = rows[0]
        old = row.get(field)
        if old == new:
            print(f"  = {rel} nov {date} {field} already {new}")
            continue
        row[field] = new
        changed += 1
        print(f"  * {rel} nov {date} {field}: {old} -> {new}")

    for (rel, month), (path, data, trailing_newline) in cache.items():
        save(path, data, trailing_newline)
        print(f"wrote {path.relative_to(ROOT)}")

    print(f"\n{changed} cells changed")


if __name__ == "__main__":
    main()
