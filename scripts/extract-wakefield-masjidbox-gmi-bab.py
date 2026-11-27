#!/usr/bin/env python3
"""Extract full-year MasjidBox times for Ghausia Masjid Institute + Bab-ul-Islam Wakefield."""

from __future__ import annotations

import json
import os
import urllib.request
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/data/mosques/gb/wakefield"
UA = {"User-Agent": "sheffield-masjids/1.0"}
APIKEY = os.environ.get("MASJIDBOX_APIKEY", "JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px")

MOSQUES = [
    {
        "id": "ghausia-masjid-institute",
        "mb_slug": "ghausia-masjid-institute-1714673625274",
        "source_md": (
            "# Ghausia Masjid Institute (Wakefield)\n\n"
            "Source: MasjidBox "
            "`https://api.masjidbox.com/1.0/masjidbox/landing/athany/"
            "ghausia-masjid-institute-1714673625274` "
            "(also linked from https://www.gmiwakefield.co.uk/prayertimes).\n\n"
            "Times converted to Europe/London. Dual Jummah preserved as `HH:MM / HH:MM`.\n"
        ),
    },
    {
        "id": "bab-ul-islam-wakefield",
        "mb_slug": "bab-ul-islam-wakefield",
        "source_md": (
            "# Bab-ul-Islam Wakefield (Community Centre)\n\n"
            "Source: MasjidBox "
            "`https://api.masjidbox.com/1.0/masjidbox/landing/athany/bab-ul-islam-wakefield` "
            "(mosque site https://buislam.org.uk/).\n\n"
            "Address: Victoria Works / Benjamin Street, Wakefield WF2 9AN.\n"
            "Times converted to Europe/London.\n"
        ),
    },
]

MONTH_NAMES = [
    "",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]


def hhmm(v: str | None) -> str:
    if not v:
        return ""
    dt = datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(LONDON)
    return dt.strftime("%H:%M")


def fetch_year(mb_slug: str) -> dict[str, dict]:
    days: dict[str, dict] = {}
    cur = date(2026, 1, 1)
    while cur <= date(2026, 12, 31):
        url = (
            f"https://api.masjidbox.com/1.0/masjidbox/landing/athany/{mb_slug}"
            f"?get=at&days=7&begin={cur.isoformat()}"
        )
        req = urllib.request.Request(url, headers={**UA, "apikey": APIKEY})
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
        for t in payload.get("timetable") or []:
            days[t["date"][:10]] = t
        cur += timedelta(days=7)
    return days


def write_month(
    mosque_id: str,
    month: int,
    prayer: list[dict],
    iqamah: list[dict],
    jummah: str,
) -> None:
    folder = OUT / mosque_id
    folder.mkdir(parents=True, exist_ok=True)
    payload = {
        "month": MONTH_NAMES[month].upper(),
        "prayer_times": prayer,
        "iqamah_times": iqamah,
        "jummah_iqamah": jummah,
    }
    path = folder / f"{MONTH_NAMES[month]}.json"
    path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"  wrote {path.relative_to(ROOT)} ({len(prayer)} days, jummah={jummah})")


def extract_one(cfg: dict) -> None:
    mosque_id = cfg["id"]
    print(f"=== {mosque_id} ===")
    days = fetch_year(cfg["mb_slug"])
    for month in range(1, 13):
        prayer, iqamah = [], []
        jummah_votes: Counter[str] = Counter()
        d = date(2026, month, 1)
        while d.month == month:
            key = d.isoformat()
            if key not in days:
                raise SystemExit(f"{mosque_id}: missing {key}")
            t = days[key]
            q = t.get("iqamah") or {}
            prayer.append(
                {
                    "date": d.day,
                    "fajr": hhmm(t["fajr"]),
                    "shurooq": hhmm(t["sunrise"]),
                    "dhuhr": hhmm(t["dhuhr"]),
                    "asr": hhmm(t["asr"]),
                    "maghrib": hhmm(t["maghrib"]),
                    "isha": hhmm(t["isha"]),
                }
            )
            iq = {
                "date_range": str(d.day),
                "fajr": hhmm(q.get("fajr")),
                "dhuhr": hhmm(q.get("dhuhr")),
                "asr": hhmm(q.get("asr")),
                "maghrib": hhmm(q.get("maghrib")),
                "isha": hhmm(q.get("isha")),
            }
            jum_list = q.get("jumuah") or t.get("jumuah") or []
            if jum_list:
                jum_str = " / ".join(hhmm(x) for x in jum_list)
                jummah_votes[jum_str] += 1
                if d.weekday() == 4:
                    iq["jummah"] = jum_str
            iqamah.append(iq)
            d += timedelta(days=1)
        jummah = jummah_votes.most_common(1)[0][0] if jummah_votes else ""
        write_month(mosque_id, month, prayer, iqamah, jummah)
    (OUT / mosque_id / "SOURCE.md").write_text(cfg["source_md"])


def main() -> None:
    for cfg in MOSQUES:
        extract_one(cfg)


if __name__ == "__main__":
    main()
