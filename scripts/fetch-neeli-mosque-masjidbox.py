#!/usr/bin/env python3
"""Fetch Neeli Mosque & Islamic Centre (UKIM), Rochdale, Nov-Dec 2026 from MasjidBox.

Source: https://masjidbox.com/prayer-times/neelimosqueislamiccentreukim
(the same MasjidBox profile embedded on https://www.neelimosque.com/), via the
MasjidBox landing/athany API in 7-day chunks. The API key is the public one in
the masjidbox.com web bundle, passed via MASJIDBOX_APIKEY.

Start times are stored as adhan (prayer_times) and jamaat times as iqamah
(iqamah_times, one range per day). Friday jamaat comes from iqamah.jumuah
(12:30 / 13:30 after BST ends); the top-level jumuah list (12:25 / 13:25) is
the Jumuah start time, not the jamaat. This matches the mosque's own monthly
PDF timetable (October 2026 shows Friday Dhuhr jamaat "12:30 / 1:30" on 30 Oct).
Times are converted to Europe/London wall-clock time.
"""
import json, os, sys, urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

SLUG = "neelimosqueislamiccentreukim"
OUT = Path(__file__).resolve().parent.parent / "public/data/mosques/gb/rochdale/neeli-mosque-rochdale"
MONTHS = {11: "november", 12: "december"}
LONDON = ZoneInfo("Europe/London")
KEY = os.environ.get("MASJIDBOX_APIKEY")
if not KEY:
    sys.exit("set MASJIDBOX_APIKEY")


def hhmm(v):
    if not v:
        return ""
    dt = datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(LONDON)
    return dt.strftime("%H:%M")


days = {}
cur = date(2026, 11, 1)
while cur <= date(2026, 12, 31):
    url = f"https://api.masjidbox.com/1.0/masjidbox/landing/athany/{SLUG}?get=at&days=7&begin={cur.isoformat()}"
    req = urllib.request.Request(url, headers={"apikey": KEY, "User-Agent": "Mozilla/5.0"})
    for t in json.load(urllib.request.urlopen(req))["timetable"]:
        days[t["date"][:10]] = t
    cur += timedelta(days=7)

OUT.mkdir(parents=True, exist_ok=True)
for mnum, mname in MONTHS.items():
    pt, iq, jum = [], [], {}
    d = date(2026, mnum, 1)
    while d.month == mnum:
        t = days[d.isoformat()]
        q = t.get("iqamah") or {}
        pt.append({"date": d.day, "fajr": hhmm(t["fajr"]), "shurooq": hhmm(t["sunrise"]),
                   "dhuhr": hhmm(t["dhuhr"]), "asr": hhmm(t["asr"]),
                   "maghrib": hhmm(t["maghrib"]), "isha": hhmm(t["isha"])})
        iq.append({"date_range": str(d.day), "fajr": hhmm(q.get("fajr")), "dhuhr": hhmm(q.get("dhuhr")),
                   "asr": hhmm(q.get("asr")), "maghrib": hhmm(q.get("maghrib")),
                   "isha": hhmm(q.get("isha"))})
        if q.get("jumuah"):
            jum[d.day] = " / ".join(hhmm(x) for x in q["jumuah"])
        d += timedelta(days=1)
    vals = sorted(set(jum.values()))
    default = vals[0] if len(vals) == 1 else ""
    if len(vals) > 1:
        # Mid-month change: keep the most common as default, set others per day.
        default = max(vals, key=lambda v: list(jum.values()).count(v))
        for r in iq:
            day = int(r["date_range"])
            if day in jum and jum[day] != default:
                r["jummah"] = jum[day]
    out = {"month": mname.upper(), "prayer_times": pt, "iqamah_times": iq, "jummah_iqamah": default}
    (OUT / f"{mname}.json").write_text(json.dumps(out, indent=2))
    print(mname, len(pt), "days, jummah", vals)
