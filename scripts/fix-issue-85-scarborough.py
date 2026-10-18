#!/usr/bin/env python3
"""Issue #85: refresh Scarborough Islamic Centre October from MasjidAl API."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "public/data/mosques/gb/scarborough/scarborough-islamic-centre/october.json"
URL = (
    "https://masjidal.com/api/v1/time/range"
    "?masjid_id=z0AWYBKj&masjid_detail=yes&from_date=2026-10-01&to_date=2026-10-31"
)


def to_24h(t: str) -> str:
    t = t.strip().upper().replace(" ", "")
    m = re.fullmatch(r"(\d{1,2}):(\d{2})(AM|PM)", t)
    if not m:
        raise ValueError(t)
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == "AM":
        if h == 12:
            h = 0
    else:
        if h != 12:
            h += 12
    return f"{h:02d}:{mi:02d}"


def day_num(date_label: str) -> int:
    # 'Thursday, Oct 18, 2026'
    m = re.search(r"Oct\s+(\d{1,2}),\s*2026", date_label)
    if not m:
        raise ValueError(date_label)
    return int(m.group(1))


def main() -> None:
    with urllib.request.urlopen(URL, timeout=30) as resp:
        payload = json.load(resp)
    data = payload["data"]
    salah = {day_num(r["date"]): r for r in data["salah"]}
    iqamah = {day_num(r["date"]): r for r in data["iqamah"]}
    prayer_times = []
    iqamah_times = []
    jummah = None
    for day in sorted(salah):
        s = salah[day]
        i = iqamah[day]
        prayer_times.append(
            {
                "date": day,
                "fajr": to_24h(s["fajr"]),
                "shurooq": to_24h(s["sunrise"]),
                "dhuhr": to_24h(s["zuhr"]),
                "asr": to_24h(s["asr"]),
                "maghrib": to_24h(s["maghrib"]),
                "isha": to_24h(s["isha"]),
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": to_24h(i["fajr"]),
                "dhuhr": to_24h(i["zuhr"]),
                "asr": to_24h(i["asr"]),
                "maghrib": to_24h(i["maghrib"]),
                "isha": to_24h(i["isha"]),
            }
        )
        if i.get("jummah1"):
            jummah = to_24h(i["jummah1"].replace(" ", ""))
    out = {
        "month": "OCTOBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
    }
    if jummah:
        out["jummah_iqamah"] = jummah
    PATH.write_text(json.dumps(out, indent=2) + "\n")
    i18 = next(r for r in iqamah_times if r["date_range"] == "18")
    print(
        f"wrote {len(prayer_times)} days; Oct18 iqamah fajr/asr/isha="
        f"{i18['fajr']}/{i18['asr']}/{i18['isha']} jummah={jummah}"
    )


if __name__ == "__main__":
    main()
