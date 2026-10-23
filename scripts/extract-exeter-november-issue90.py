#!/usr/bin/env python3
"""Extract Exeter Mosque November 2026 from official HTML timetable.

Source: https://exetermosque.org.uk/timetable/?month=11
"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

URL = "https://exetermosque.org.uk/timetable/?month=11"
OUT = Path("public/data/mosques/gb/exeter/exeter-mosque/november.json")


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0; +issue90)"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "replace")


def normalize(t: str) -> str:
    t = t.strip()
    m = re.match(r"^(\d{1,2}):(\d{2})$", t)
    if not m:
        raise ValueError(f"bad time: {t!r}")
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def parse(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        raise RuntimeError("no timetable table found")

    prayer_times: list[dict] = []
    iqamah_times: list[dict] = []
    jummah_candidates: list[str] = []

    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(cells) < 14:
            continue
        if cells[0] == "Day" or not cells[1].isdigit():
            continue
        day_name = cells[0]
        day = int(cells[1])
        fajr_a, fajr_j = normalize(cells[3]), normalize(cells[4])
        sunrise = normalize(cells[5])
        dhuhr_a, dhuhr_j = normalize(cells[6]), normalize(cells[7])
        asr_a, asr_j = normalize(cells[8]), normalize(cells[9])
        mag_a, mag_j = normalize(cells[10]), normalize(cells[11])
        isha_a, isha_j = normalize(cells[12]), normalize(cells[13])

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
        if day_name.lower().startswith("fri"):
            jummah_candidates.append(dhuhr_j)

    if len(prayer_times) != 30:
        raise RuntimeError(f"expected 30 November days, got {len(prayer_times)}")

    # Friday dhuhr iqamah is Jumu'ah (13:00); weekdays use 13:10.
    jummah = jummah_candidates[0] if jummah_candidates else iqamah_times[0]["dhuhr"]
    if len(set(jummah_candidates)) != 1:
        raise RuntimeError(f"inconsistent Friday jummah values: {jummah_candidates}")

    return {
        "month": "NOVEMBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def main() -> None:
    html = fetch(URL)
    if "November 2026" not in html:
        raise RuntimeError("page does not look like November 2026 timetable")
    data = parse(html)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(
        f"wrote {OUT} days={len(data['prayer_times'])} "
        f"jummah={data['jummah_iqamah']} "
        f"day1={data['prayer_times'][0]} iq1={data['iqamah_times'][0]}"
    )


if __name__ == "__main__":
    main()
