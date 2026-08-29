#!/usr/bin/env python3
"""Extract full-year Redbridge Islamic Centre prayer data from themasjidapp
__NEXT_DATA__ (masjid.azanParams.imported = adhan, masjid.iqamas = iqamah).

Day-of-year keys 1-365 map to 2026. Events with isJuma give Jumu'ah times.
Usage: python3 scripts/extract-redbridge-themasjidapp.py <page.html> <outdir>
"""
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
FILES = [m.lower() for m in MONTHS]


def to24(t: str) -> str:
    """'6:26 AM' -> '06:26', '12:09 PM' -> '12:09', '12:30 am' -> '00:30'."""
    s = t.strip().lower()
    m = re.match(r"(\d{1,2}):(\d{2})\s*(am|pm)", s)
    if not m:
        return ""
    h, mi, ap = int(m.group(1)), m.group(2), m.group(3)
    if ap == "pm" and h != 12:
        h += 12
    if ap == "am" and h == 12:
        h = 0
    return f"{h:02d}:{mi}"


def main() -> None:
    src = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)
    html = src.read_text()
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', html)
    if not m:
        print("No __NEXT_DATA__ found")
        sys.exit(1)
    data = json.loads(m.group(1))
    masjid = data["props"]["pageProps"]["masjid"]
    imported = masjid["azanParams"]["imported"]
    iqamas = masjid["iqamas"]
    juma = [e["timeDesc"] for e in masjid.get("events", []) if e.get("isJuma")]
    print(f"masjid: {masjid['name']} | imported {len(imported)} days | iqamas {len(iqamas)} days | jumuah: {juma}")

    year_start = date(2026, 1, 1)
    months: dict[int, list] = {i: [] for i in range(1, 13)}
    for doy, adhan in imported.items():
        d = year_start + timedelta(days=int(doy) - 1)
        iq = iqamas.get(str(doy), {})
        months[d.month].append({
            "date": d.day,
            "fajr": to24(adhan.get("fajr", "")),
            "shurooq": to24(adhan.get("sunrise", "")),
            "dhuhr": to24(adhan.get("zuhr", "")),
            "asr": to24(adhan.get("asr", "")),
            "maghrib": to24(adhan.get("maghrib", "")),
            "isha": to24(adhan.get("isha", "")),
            "iq": {
                "fajr": to24(iq.get("fajr", "")),
                "dhuhr": to24(iq.get("dhuhr", "")),
                "asr": to24(iq.get("asr", "")),
                "maghrib": to24(iq.get("maghrib", "")),
                "isha": to24(iq.get("isha", "")),
            },
        })

    jummah = to24(juma[0]) if juma else ""
    for month in range(1, 13):
        rows = months[month]
        if not rows:
            continue
        rows.sort(key=lambda r: r["date"])
        prayer_times = [{k: r[k] for k in ("date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")} for r in rows]
        # Only keep iqamah rows where all required fields are present (seed
        # validator requires non-empty strings; source omits some days).
        iqamah_times = [{
            "date_range": str(r["date"]),
            "fajr": r["iq"]["fajr"],
            "dhuhr": r["iq"]["dhuhr"],
            "asr": r["iq"]["asr"],
            "maghrib": r["iq"]["maghrib"],
            "isha": r["iq"]["isha"],
        } for r in rows if all(r["iq"][k] for k in ("fajr", "dhuhr", "asr", "isha"))]
        data_out = {
            "month": MONTHS[month - 1],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        }
        path = out_dir / f"{FILES[month - 1]}.json"
        path.write_text(json.dumps(data_out, indent=2))
        print(f"  Wrote {path} ({len(prayer_times)} days, jummah {jummah})")


if __name__ == "__main__":
    main()
