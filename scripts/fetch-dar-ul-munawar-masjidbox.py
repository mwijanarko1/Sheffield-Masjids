#!/usr/bin/env python3
"""Fetch Dar-Ul-Munawar Ghamkol Sharif (Rochdale, two branches) Oct-Dec 2026 from MasjidBox.

Sources:
  Crawford Street: https://masjidbox.com/prayer-times/dar-ul-munawar-ghamkol-sharif-1613587873320
  Derby Street:    https://masjidbox.com/prayer-times/dar-ul-munawar-ghamkol-sharif
(MasjidBox landing/athany API, 7-day chunks; API key is the public one in the
masjidbox.com web bundle, passed via MASJIDBOX_APIKEY).

Both branches publish a single set of times (every MasjidBox iqamah field equals
the prayer field, to the minute). Per Mikhail (25 Oct 2026) the published time is
stored as ADHAN ONLY: iqamah_times is an empty list (adhan-only convention, API
returns "iqamah": null). The published Friday Jumuah time is kept in jummah_iqamah.
Times are kept as the published local wall-clock time (BST to 24 Oct, GMT after).
"""
import json, os, re, sys, urllib.request
from datetime import date, timedelta
from pathlib import Path

BRANCHES = {
    "dar-ul-munawar-ghamkol-sharif-crawford-street": "dar-ul-munawar-ghamkol-sharif-1613587873320",
    "dar-ul-munawar-ghamkol-sharif-derby-street": "dar-ul-munawar-ghamkol-sharif",
}
DATA = Path(__file__).resolve().parent.parent / "public/data/mosques/gb/rochdale"
MONTHS = {10: "october", 11: "november", 12: "december"}
KEY = os.environ.get("MASJIDBOX_APIKEY")
if not KEY:
    sys.exit("set MASJIDBOX_APIKEY")


def hhmm(v):
    m = re.search(r"T(\d{2}):(\d{2})", v or "")
    return f"{m.group(1)}:{m.group(2)}" if m else ""


def build(local_slug, SLUG):
    OUT = DATA / local_slug
    days = {}
    cur = date(2026, 10, 1)
    while cur <= date(2026, 12, 31):
        url = f"https://api.masjidbox.com/1.0/masjidbox/landing/athany/{SLUG}?get=at&days=7&begin={cur.isoformat()}"
        req = urllib.request.Request(url, headers={"apikey": KEY, "User-Agent": "Mozilla/5.0"})
        data = json.load(urllib.request.urlopen(req))
        for t in data["timetable"]:
            days[t["date"][:10]] = t
        cur += timedelta(days=7)

    OUT.mkdir(parents=True, exist_ok=True)
    for mnum, mname in MONTHS.items():
        pt, jum = [], []
        d = date(2026, mnum, 1)
        while d.month == mnum:
            t = days[d.isoformat()]
            q = t.get("iqamah", {})
            pt.append({"date": d.day, "fajr": hhmm(t["fajr"]), "shurooq": hhmm(t["sunrise"]),
                       "dhuhr": hhmm(t["dhuhr"]), "asr": hhmm(t["asr"]),
                       "maghrib": hhmm(t["maghrib"]), "isha": hhmm(t["isha"])})
            js = q.get("jumuah") or t.get("jumuah") or []
            if js:
                jum.append(" / ".join(hhmm(x) for x in js))
            d += timedelta(days=1)
        jset = sorted(set(jum))
        out = {"month": mname.upper(), "prayer_times": pt, "iqamah_times": [],
               "jummah_iqamah": jset[0] if len(jset) == 1 else ""}
        if len(jset) > 1:
            print(f"{mname}: multiple jummah values {jset}", file=sys.stderr)
        (OUT / f"{mname}.json").write_text(json.dumps(out, indent=2))
        print(mname, len(pt), "days, jummah", jset)


for local, remote in BRANCHES.items():
    print("==", local)
    build(local, remote)
