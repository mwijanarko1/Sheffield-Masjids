#!/usr/bin/env python3
"""Fix YCA Sandwell October 2026 iqamah bands from PDF vision (issue #85).

Source PDF: YCC_Masjid_Prayer_Timetable_October_2026.pdf
Khutbah times are NOT jummah_iqamah — keep dhuhr jamaat (13:30).
Maghrib jamaat equals Maghrib start (no delay).
"""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path("public/data/mosques/gb/west-bromwich/yca-sandwell-masjid/october.json")


def band(day: int) -> dict[str, str]:
    # Fajr / Asr / Isha jamaat bands from PDF (ditto marks).
    if day == 1:
        fajr, asr, isha = "06:00", "16:30", "20:30"
    elif 2 <= day <= 8:
        fajr, asr, isha = "06:15", "16:30", "20:15"
    elif 9 <= day <= 15:
        fajr, asr, isha = "06:30", "16:15", "20:00"
    elif 16 <= day <= 22:
        fajr, asr, isha = "06:45", "16:00", "19:45"
    elif 23 <= day <= 24:
        fajr, asr, isha = "06:45", "15:45", "19:30"
    elif 25 <= day <= 29:
        fajr, asr, isha = "05:45", "14:45", "18:30"
    else:  # 30-31
        fajr, asr, isha = "06:00", "14:30", "18:15"

    if day <= 24:
        dhuhr = "13:30"
    else:
        dhuhr = "12:30"

    return {"fajr": fajr, "dhuhr": dhuhr, "asr": asr, "isha": isha}


def main() -> None:
    data = json.loads(OUT.read_text())
    by_date = {p["date"]: p for p in data["prayer_times"]}
    iqamah = []
    for day in sorted(by_date):
        pt = by_date[day]
        b = band(day)
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": b["fajr"],
                "dhuhr": b["dhuhr"],
                "asr": b["asr"],
                "maghrib": pt["maghrib"],  # PDF: start = jamaat
                "isha": b["isha"],
            }
        )
    data["iqamah_times"] = iqamah
    # Dhuhr jamaat, not second khutbah (14:30)
    data["jummah_iqamah"] = "13:30"
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    for day in [1, 8, 9, 16, 18, 22, 23, 25, 29, 30]:
        iq = next(x for x in iqamah if x["date_range"] == str(day))
        print(day, iq)


if __name__ == "__main__":
    main()
