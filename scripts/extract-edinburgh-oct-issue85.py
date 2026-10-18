#!/usr/bin/env python3
"""Extract Edinburgh Central Mosque October 2026 from WP page HTML (issue #85).

Source: https://edmosque.org/about-the-mosque/prayer-times/ (wp-json pages/1979)
Maghrib iqamah = adhan + 5 minutes (band shows +5).
"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

PAGE_URL = "https://edmosque.org/wp-json/wp/v2/pages/1979"
OUT = Path("public/data/mosques/gb/edinburgh/edinburgh-central-mosque/october.json")


def add_minutes(t: str, mins: int) -> str:
    h, m = map(int, t.split(":"))
    total = h * 60 + m + mins
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


def parse_content(html: str) -> tuple[list[dict], list[dict], str]:
    # Jamaah band rows: Jama'ah (A–B October) then fajr, zuhr, asr, +5, isha
    band_re = re.compile(
        r"Jama&#8217;ah \((\d+)&#8211;(\d+) October\).*?"
        r"<b><i>(\d{2}:\d{2})</i></b>\s*"
        r"<td[^>]*><b><i>(\d{2}:\d{2})</i></b>\s*"
        r"<td[^>]*><b><i>(\d{2}:\d{2})</i></b>\s*"
        r"<td[^>]*><b><i>\+5</i></b>\s*"
        r"<td[^>]*><b><i>(\d{2}:\d{2})</i></b>",
        re.I | re.S,
    )
    bands: list[tuple[int, int, dict[str, str]]] = []
    for m in band_re.finditer(html):
        a, b = int(m.group(1)), int(m.group(2))
        bands.append(
            (
                a,
                b,
                {
                    "fajr": m.group(3),
                    "dhuhr": m.group(4),
                    "asr": m.group(5),
                    "isha": m.group(6),
                },
            )
        )

    day_re = re.compile(
        r"<td>\s*(\d+)\s*<td>(?:Thursday|Friday|Saturday|Sunday|Monday|Tuesday|Wednesday)"
        r"<td>(\d{2}:\d{2})<td>(\d{2}:\d{2})<td>(\d{2}:\d{2})"
        r"<td>(\d{2}:\d{2})<td>(\d{2}:\d{2})",
        re.I,
    )
    prayer_times = []
    iqamah_times = []
    jummah = "13:15"
    existing = {}
    if OUT.exists():
        existing = {p["date"]: p for p in json.loads(OUT.read_text())["prayer_times"]}
        jummah = json.loads(OUT.read_text()).get("jummah_iqamah", jummah)

    for m in day_re.finditer(html):
        day = int(m.group(1))
        fajr, dhuhr, asr, maghrib, isha = m.group(2), m.group(3), m.group(4), m.group(5), m.group(6)
        shurooq = existing.get(day, {}).get("shurooq", "")
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr,
                "shurooq": shurooq,
                "dhuhr": dhuhr,
                "asr": asr,
                "maghrib": maghrib,
                "isha": isha,
            }
        )
        band = next((b for a, b_end, b in bands if a <= day <= b_end), None)
        if not band:
            raise SystemExit(f"No jamaah band for day {day}")
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": band["fajr"],
                "dhuhr": band["dhuhr"],
                "asr": band["asr"],
                "maghrib": add_minutes(maghrib, 5),
                "isha": band["isha"],
            }
        )

    if len(prayer_times) != 31:
        raise SystemExit(f"Expected 31 days, got {len(prayer_times)}")
    return prayer_times, iqamah_times, jummah


def main() -> None:
    req = urllib.request.Request(PAGE_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode())
    html = payload["content"]["rendered"]
    prayer_times, iqamah_times, jummah = parse_content(html)
    out = {
        "month": "OCTOBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    for day in [18, 19, 24]:
        iq = next(x for x in iqamah_times if x["date_range"] == str(day))
        pt = next(x for x in prayer_times if x["date"] == day)
        print(day, "adhan", pt, "iqamah", iq)


if __name__ == "__main__":
    main()
