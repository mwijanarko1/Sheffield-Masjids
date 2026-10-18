#!/usr/bin/env python3
"""Extract BMJM Dundee October (and November if published) from timetable.php."""
from __future__ import annotations

import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL = "https://bmjmdundee.com/timetable.php"
OUT_DIR = Path("public/data/mosques/gb/dundee/bmjm-dundee")


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.cell = ""
        self.row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "table":
            self.in_table = True
        elif self.in_table and tag == "tr":
            self.in_row = True
            self.row = []
        elif self.in_table and tag in {"td", "th"}:
            self.in_cell = True
            self.cell = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "table":
            self.in_table = False
        elif tag == "tr" and self.in_row:
            self.in_row = False
            if self.row:
                self.rows.append(self.row)
        elif tag in {"td", "th"} and self.in_cell:
            self.in_cell = False
            self.row.append(re.sub(r"\s+", " ", self.cell).strip())

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.cell += data


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def parse_month(html: str) -> dict | None:
    parser = TableParser()
    parser.feed(html)
    if not parser.rows:
        return None
    header = [c.lower() for c in parser.rows[0]]
    # Expect Date Day FajrAdhan FajrJamaah Sunrise DhuhrAdhan ...
    prayer_times = []
    iqamah_times = []
    jummah_candidates = []
    for row in parser.rows[1:]:
        if len(row) < 13:
            continue
        date_cell = row[0]
        m = re.match(r"(\d{2})/(\d{2})/(\d{4})", date_cell)
        if not m:
            continue
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if year != 2026:
            continue
        day_name = row[1]
        fajr_a, fajr_j, sunrise = row[2], row[3], row[4]
        dhuhr_a, dhuhr_j = row[5], row[6]
        asr_a, asr_j = row[7], row[8]
        mag_a, mag_j = row[9], row[10]
        isha_a, isha_j = row[11], row[12]
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr_a,
                "shurooq": sunrise,
                "dhuhr": dhuhr_a,
                "asr": asr_a,
                "maghrib": mag_a,
                "isha": isha_a,
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": fajr_j,
                "dhuhr": dhuhr_j,
                "asr": asr_j,
                "maghrib": mag_j,
                "isha": isha_j,
            }
        )
        if "fri" in day_name.lower():
            jummah_candidates.append(dhuhr_j)
        month_num = month

    if not prayer_times:
        return None
    month_names = {
        10: "OCTOBER",
        11: "NOVEMBER",
    }
    jummah = jummah_candidates[0] if jummah_candidates else iqamah_times[0]["dhuhr"]
    return {
        "month": month_names.get(month_num, f"MONTH{month_num}"),
        "month_num": month_num,
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def main() -> None:
    # Default page currently shows October; try common November URLs too.
    candidates = [
        URL,
        f"{URL}?month=11",
        f"{URL}?month=November",
        f"{URL}?m=11",
        f"{URL}?date=2026-11-01",
        "https://bmjmdundee.com/timetable.php?month=november&year=2026",
    ]
    seen_months: set[int] = set()
    for url in candidates:
        try:
            html = fetch(url)
        except Exception as exc:
            print(f"skip {url}: {exc}")
            continue
        parsed = parse_month(html)
        if not parsed:
            print(f"no rows from {url}")
            continue
        month_num = parsed.pop("month_num")
        if month_num in seen_months:
            continue
        seen_months.add(month_num)
        fname = {10: "october.json", 11: "november.json"}.get(month_num)
        if not fname:
            print(f"unexpected month {month_num}")
            continue
        out = {
            "month": parsed["month"],
            "prayer_times": parsed["prayer_times"],
            "iqamah_times": parsed["iqamah_times"],
            "jummah_iqamah": parsed["jummah_iqamah"],
        }
        path = OUT_DIR / fname
        path.write_text(json.dumps(out, indent=2) + "\n")
        print(
            f"wrote {path} days={len(out['prayer_times'])} jummah={out['jummah_iqamah']}"
        )
        if month_num == 10:
            for day in [18, 19, 31]:
                iq = next(x for x in out["iqamah_times"] if x["date_range"] == str(day))
                print(" ", day, iq)

    if 11 not in seen_months:
        print("November not published — no november.json written")


if __name__ == "__main__":
    main()
