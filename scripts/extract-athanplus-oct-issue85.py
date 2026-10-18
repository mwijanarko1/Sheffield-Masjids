#!/usr/bin/env python3
"""Re-extract October AthanPlus months for ISBCC + Memphis (issue #85).

Stdlib-only HTML parse (no bs4). Maghrib iqamah = maghrib adhan.
"""
from __future__ import annotations

import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

TARGETS = [
    (
        "zVKp9PLP",
        Path("public/data/mosques/us/boston/islamic-society-boston-cultural-center"),
    ),
    (
        "1QL0gbKZ",
        Path("public/data/mosques/us/memphis/memphis-islamic-center"),
    ),
]

BASE = (
    "https://timing.athanplus.com/masjid/widgets/monthly"
    "?theme=1&masjid_id={masjid_id}&date=2026-10-01"
)


class RowParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_tr = False
        self.in_td = False
        self.cell = ""
        self.row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self.in_tr = True
            self.row = []
        elif tag == "td" and self.in_tr:
            self.in_td = True
            self.cell = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "td" and self.in_td:
            self.in_td = False
            self.row.append(re.sub(r"\s+", " ", self.cell).strip())
        elif tag == "tr" and self.in_tr:
            self.in_tr = False
            if self.row:
                self.rows.append(self.row)

    def handle_data(self, data: str) -> None:
        if self.in_td:
            self.cell += data


def normalize_time(value: str, prayer: str) -> str:
    value = value.strip().upper().replace("SUNSET", "").strip()
    if not value:
        return ""
    match = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", value)
    if not match:
        return ""
    hour = int(match.group(1))
    minute = match.group(2)
    meridiem = match.group(3)
    if meridiem:
        if meridiem == "PM" and hour != 12:
            hour += 12
        if meridiem == "AM" and hour == 12:
            hour = 0
    elif prayer in {"dhuhr", "asr", "maghrib", "isha"} and hour < 12:
        hour += 12
    elif prayer == "fajr" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def expand_iqamah(days: list[int], sparse: dict[int, dict]) -> dict[int, dict]:
    if not sparse:
        return {}
    schedule_days = sorted(sparse)
    expanded: dict[int, dict] = {}
    cursor = 0
    for day in days:
        while cursor + 1 < len(schedule_days) and schedule_days[cursor + 1] <= day:
            cursor += 1
        expanded[day] = sparse[schedule_days[cursor]]
    return expanded


def parse_month(html: str) -> dict:
    parser = RowParser()
    parser.feed(html)
    prayer_rows: dict[int, dict] = {}
    for cells in parser.rows:
        if len(cells) == 9 and cells[0].isdigit():
            day = int(cells[0])
            prayer_rows[day] = {
                "fajr": normalize_time(cells[3], "fajr"),
                "shurooq": normalize_time(cells[4], "shurooq"),
                "dhuhr": normalize_time(cells[5], "dhuhr"),
                "asr": normalize_time(cells[6], "asr"),
                "maghrib": normalize_time(cells[7], "maghrib"),
                "isha": normalize_time(cells[8], "isha"),
                "weekday": cells[2],
            }

    # Iqamah section: after a row containing IQAMAH TIMINGS
    iqamah_sparse: dict[int, dict] = {}
    in_iqamah = False
    for cells in parser.rows:
        header = " ".join(cells).upper()
        if "IQAMAH" in header and "TIMING" in header:
            in_iqamah = True
            continue
        if not in_iqamah:
            continue
        if cells and "JUMU" in cells[0].upper():
            break
        if not cells or cells[0] in {"DATE", "FAJR", "DHUHR"}:
            continue
        match = re.match(r"[A-Z]{3},\s*(\d{1,2})$", cells[0], re.I)
        if not match or len(cells) < 6:
            continue
        day = int(match.group(1))
        iqamah_sparse[day] = {
            "fajr": normalize_time(cells[1], "fajr"),
            "dhuhr": normalize_time(cells[2], "dhuhr"),
            "asr": normalize_time(cells[3], "asr"),
            "isha": normalize_time(cells[5], "isha"),
        }

    jummah = ""
    m = re.search(r"JUMU'?AH\s+(\d{1,2}:\d{2}\s*[AP]M)", html, re.I)
    if m:
        jummah = normalize_time(m.group(1), "dhuhr")

    days = sorted(prayer_rows)
    iqamah_rows = expand_iqamah(days, iqamah_sparse)
    prayer_times = []
    iqamah_times = []
    for day in days:
        p = prayer_rows[day]
        iq = iqamah_rows.get(day, {})
        prayer_times.append(
            {
                "date": day,
                "fajr": p["fajr"],
                "shurooq": p["shurooq"],
                "dhuhr": p["dhuhr"],
                "asr": p["asr"],
                "maghrib": p["maghrib"],
                "isha": p["isha"],
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": iq.get("fajr", p["fajr"]),
                "dhuhr": iq.get("dhuhr", p["dhuhr"]),
                "asr": iq.get("asr", p["asr"]),
                "maghrib": p["maghrib"],
                "isha": iq.get("isha", p["isha"]),
            }
        )
    if not jummah:
        fri = next((d for d in days if prayer_rows[d]["weekday"].upper().startswith("FRI")), None)
        if fri is not None:
            jummah = iqamah_rows.get(fri, {}).get("dhuhr", prayer_rows[fri]["dhuhr"])
    return {
        "month": "OCTOBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah or iqamah_times[0]["dhuhr"],
        "_iqamah_sparse": iqamah_sparse,
    }


def main() -> None:
    for masjid_id, out_dir in TARGETS:
        url = BASE.format(masjid_id=masjid_id)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", "replace")
        Path(f"/tmp/issue85/athanplus-{masjid_id}.html").write_text(html)
        data = parse_month(html)
        sparse = data.pop("_iqamah_sparse")
        out_path = out_dir / "october.json"
        out_path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"\n{out_dir.name} sparse={sparse}")
        for day in [1, 18, 19, 25]:
            iq = next((x for x in data["iqamah_times"] if x["date_range"] == str(day)), None)
            print(" ", day, iq)


if __name__ == "__main__":
    main()
