#!/usr/bin/env python3
"""Extract top Wakefield mosques into monthly JSON.

1. masjid-zakariya — DPT get_monthly_timetable (full year)
2. jamia-masjid-swafia — MasjidBox landing/athany API (full year)
3. wakefield-central-mosque — Firestore prayerCalendar (adhan) + live prayerTimes/today (jamaat)
4. markazi / ghausia — handled separately (PDF/vision or no HTTP source)

Usage:
  MASJIDBOX_APIKEY=... python3 scripts/extract-wakefield-top5.py
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    from bs4 import BeautifulSoup
except ImportError as e:  # pragma: no cover
    raise SystemExit("BeautifulSoup required: pip install beautifulsoup4") from e

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/data/mosques/gb/wakefield"
MONTHS = [
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
LONDON = ZoneInfo("Europe/London")
UA = {"User-Agent": "Mozilla/5.0 (compatible; sheffield-masjids/1.0)"}


def to_24h(text: str) -> str:
    t = text.strip().lower().replace(".", ":")
    t = re.sub(r"\s+", " ", t)
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(am|pm)?$", t)
    if not m:
        raise ValueError(f"bad time: {text!r}")
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == "pm" and h != 12:
        h += 12
    if ap == "am" and h == 12:
        h = 0
    if ap is None and h < 12 and ("pm" in text.lower()):
        pass
    return f"{h:02d}:{mi:02d}"


def write_month(slug: str, month_idx: int, prayer: list, iqamah: list, jummah: str) -> None:
    folder = OUT / slug
    folder.mkdir(parents=True, exist_ok=True)
    name = MONTHS[month_idx - 1]
    doc = {
        "month": name.upper(),
        "prayer_times": prayer,
        "iqamah_times": iqamah,
        "jummah_iqamah": jummah,
    }
    (folder / f"{name}.json").write_text(json.dumps(doc, indent=2) + "\n")
    print(f"  wrote {slug}/{name}.json days={len(prayer)} jummah={jummah}")


# --- Masjid Zakariya (DPT) -------------------------------------------------


def extract_zakariya() -> None:
    print("=== masjid-zakariya (DPT) ===")
    ajax = "https://masjidzakariya.co.uk/wp-admin/admin-ajax.php"
    jummah_votes: Counter[str] = Counter()
    for month in range(1, 13):
        data = urllib.parse.urlencode(
            {"action": "get_monthly_timetable", "month": str(month)}
        ).encode()
        req = urllib.request.Request(ajax, data=data, headers=UA)
        html = urllib.request.urlopen(req).read().decode("utf-8", "ignore")
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", class_="dptTimetable")
        if not table:
            raise SystemExit(f"zakariya: no table for month {month}")
        prayer, iqamah = [], []
        for row in table.find_all("tr"):
            tds = row.find_all("td")
            if len(tds) < 14:
                continue
            date_txt = tds[0].get_text(" ", strip=True)
            m = re.search(r"(\d{1,2})", date_txt)
            if not m:
                continue
            day = int(m.group(1))
            # Date Day FajrS FajrJ Sunrise ZuhrS ZuhrJ AsrStd AsrHan AsrJ MagS MagJ IshaS IshaJ
            cells = [td.get_text(" ", strip=True) for td in tds]
            fajr_s, fajr_j, sunrise = cells[2], cells[3], cells[4]
            zuhr_s, zuhr_j = cells[5], cells[6]
            asr_std, asr_han, asr_j = cells[7], cells[8], cells[9]
            mag_s, mag_j = cells[10], cells[11]
            isha_s, isha_j = cells[12], cells[13]
            asr_std_t = to_24h(asr_std)
            asr_han_t = to_24h(asr_han)
            pt = {
                "date": day,
                "fajr": to_24h(fajr_s),
                "shurooq": to_24h(sunrise),
                "dhuhr": to_24h(zuhr_s),
                "asr": asr_std_t,
                "maghrib": to_24h(mag_s),
                "isha": to_24h(isha_s),
            }
            if asr_han_t != asr_std_t:
                pt["asr_mithl2"] = asr_han_t
            prayer.append(pt)
            iqamah.append(
                {
                    "date_range": str(day),
                    "fajr": to_24h(fajr_j),
                    "dhuhr": to_24h(zuhr_j),
                    "asr": to_24h(asr_j),
                    "maghrib": to_24h(mag_j),
                    "isha": to_24h(isha_j),
                }
            )
            if "friday" in cells[1].lower():
                jummah_votes[to_24h(zuhr_j)] += 1
        if not prayer:
            raise SystemExit(f"zakariya: empty month {month}")
        month_fridays = Counter()
        for row in table.find_all("tr"):
            tds = row.find_all("td")
            if len(tds) < 7:
                continue
            if "friday" in tds[1].get_text(" ", strip=True).lower():
                month_fridays[to_24h(tds[6].get_text(" ", strip=True))] += 1
        jummah = (
            month_fridays.most_common(1)[0][0]
            if month_fridays
            else (jummah_votes.most_common(1)[0][0] if jummah_votes else "13:30")
        )
        write_month("masjid-zakariya", month, prayer, iqamah, jummah)
    (OUT / "masjid-zakariya" / "SOURCE.md").write_text(
        "# Masjid Zakariya (Wakefield)\n\n"
        "Source: `https://masjidzakariya.co.uk/wp-admin/admin-ajax.php` "
        "`action=get_monthly_timetable` (Daily Prayer Time for Mosques plugin).\n\n"
        "Asr: Standard → `asr`, Hanafi → `asr_mithl2` when they differ.\n"
        "Jummah iqamah: Friday Dhuhr jamaat from the same table.\n"
    )


# --- Jamia Masjid Swafia (MasjidBox) ---------------------------------------


def hhmm_mb(v: str | None) -> str:
    if not v:
        return ""
    dt = datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(LONDON)
    return dt.strftime("%H:%M")


def extract_swafia() -> None:
    print("=== jamia-masjid-swafia (MasjidBox) ===")
    key = os.environ.get("MASJIDBOX_APIKEY")
    if not key:
        raise SystemExit("set MASJIDBOX_APIKEY")
    slug = "jamia-masjid-swafia"
    days: dict[str, dict] = {}
    cur = date(2026, 1, 1)
    while cur <= date(2026, 12, 31):
        url = (
            f"https://api.masjidbox.com/1.0/masjidbox/landing/athany/{slug}"
            f"?get=at&days=7&begin={cur.isoformat()}"
        )
        req = urllib.request.Request(url, headers={**UA, "apikey": key})
        payload = json.load(urllib.request.urlopen(req))
        for t in payload.get("timetable") or []:
            days[t["date"][:10]] = t
        cur += timedelta(days=7)
    for month in range(1, 13):
        prayer, iqamah = [], []
        jummah_votes: Counter[str] = Counter()
        d = date(2026, month, 1)
        while d.month == month:
            key_d = d.isoformat()
            if key_d not in days:
                raise SystemExit(f"swafia: missing {key_d}")
            t = days[key_d]
            q = t.get("iqamah") or {}
            prayer.append(
                {
                    "date": d.day,
                    "fajr": hhmm_mb(t["fajr"]),
                    "shurooq": hhmm_mb(t["sunrise"]),
                    "dhuhr": hhmm_mb(t["dhuhr"]),
                    "asr": hhmm_mb(t["asr"]),
                    "maghrib": hhmm_mb(t["maghrib"]),
                    "isha": hhmm_mb(t["isha"]),
                }
            )
            iq = {
                "date_range": str(d.day),
                "fajr": hhmm_mb(q.get("fajr")),
                "dhuhr": hhmm_mb(q.get("dhuhr")),
                "asr": hhmm_mb(q.get("asr")),
                "maghrib": hhmm_mb(q.get("maghrib")),
                "isha": hhmm_mb(q.get("isha")),
            }
            jum_list = q.get("jumuah") or t.get("jumuah") or []
            if jum_list:
                jum_str = " / ".join(hhmm_mb(x) for x in jum_list)
                jummah_votes[jum_str] += 1
                if d.weekday() == 4:
                    iq["jummah"] = jum_str
            iqamah.append(iq)
            d += timedelta(days=1)
        jummah = jummah_votes.most_common(1)[0][0] if jummah_votes else ""
        write_month("jamia-masjid-swafia", month, prayer, iqamah, jummah)
    (OUT / "jamia-masjid-swafia" / "SOURCE.md").write_text(
        "# Jamia Masjid Swafia (Wakefield)\n\n"
        "Source: MasjidBox `https://api.masjidbox.com/1.0/masjidbox/landing/athany/jamia-masjid-swafia` "
        "(embedded on https://www.swafia.org.uk/).\n\n"
        "Times converted to Europe/London. Dual Jummah preserved as `HH:MM / HH:MM`.\n"
    )


# --- Wakefield Central Mosque (Firestore) -----------------------------------


def fs_get(path: str) -> dict:
    url = (
        "https://firestore.googleapis.com/v1/projects/wakefield-central-mosque/"
        f"databases/(default)/documents/{path}"
    )
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req))


def fs_fields(doc: dict) -> dict[str, str]:
    out = {}
    for k, v in (doc.get("fields") or {}).items():
        if "stringValue" in v:
            out[k] = v["stringValue"]
    return out


def extract_central() -> None:
    print("=== wakefield-central-mosque (Firestore) ===")
    # Full-year adhan calendar (DD-MM docs)
    base = "artifacts/masjid-connect-app/public/data/prayerCalendar"
    calendar: dict[tuple[int, int], dict[str, str]] = {}
    token = None
    while True:
        url = (
            "https://firestore.googleapis.com/v1/projects/wakefield-central-mosque/"
            f"databases/(default)/documents/{base}?pageSize=300"
        )
        if token:
            url += "&pageToken=" + urllib.parse.quote(token)
        data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA)))
        for doc in data.get("documents") or []:
            doc_id = doc["name"].rsplit("/", 1)[-1]
            dd, mm = map(int, doc_id.split("-"))
            calendar[(mm, dd)] = fs_fields(doc)
        token = data.get("nextPageToken")
        if not token:
            break
    if len(calendar) < 365:
        raise SystemExit(f"central: expected ~365 days, got {len(calendar)}")

    jamaat = fs_fields(
        fs_get("artifacts/masjid-connect-app/public/data/prayerTimes/today")
    )
    # Maghrib jamaat = Maghrib start (explicit in prayerTimetable.mjs)
    jummah = jamaat.get("Jumma", "")
    jummah2 = jamaat.get("Jumma2", "")
    jummah_str = " / ".join(x for x in (jummah, jummah2) if x)

    # Only emit days where live jamaat >= adhan for every prayer (avoids winter
    # jamaat bleeding into summer / early-November Asr).
    def jamaat_ok(row: dict[str, str]) -> bool:
        checks = [
            ("Fajr", "Fajr"),
            ("Zuhr", "Zuhr"),
            ("Asr", "Asr"),
            ("Maghrib", "Maghrib"),  # jamaat = start
            ("Isha", "Isha"),
        ]
        for cal_key, jam_key in checks:
            jam = row[cal_key] if jam_key == "Maghrib" else jamaat[jam_key]
            ch, cm = map(int, row[cal_key].split(":"))
            jh, jm = map(int, jam.split(":"))
            if jh * 60 + jm < ch * 60 + cm:
                return False
        return True

    for month in (11, 12):
        prayer, iqamah = [], []
        d = date(2026, month, 1)
        while d.month == month:
            row = calendar.get((month, d.day))
            if not row:
                raise SystemExit(f"central: missing {d}")
            if not jamaat_ok(row):
                d += timedelta(days=1)
                continue
            fajr, sunrise = row["Fajr"], row["Sunrise"]
            zuhr, asr = row["Zuhr"], row["Asr"]
            maghrib, isha = row["Maghrib"], row["Isha"]
            prayer.append(
                {
                    "date": d.day,
                    "fajr": fajr,
                    "shurooq": sunrise,
                    "dhuhr": zuhr,
                    "asr": asr,
                    "maghrib": maghrib,
                    "isha": isha,
                }
            )
            iqamah.append(
                {
                    "date_range": str(d.day),
                    "fajr": jamaat["Fajr"],
                    "dhuhr": jamaat["Zuhr"],
                    "asr": jamaat["Asr"],
                    "maghrib": maghrib,
                    "isha": jamaat["Isha"],
                }
            )
            d += timedelta(days=1)
        if not prayer:
            raise SystemExit(f"central: no valid days for month {month}")
        write_month("wakefield-central-mosque", month, prayer, iqamah, jummah_str)

    (OUT / "wakefield-central-mosque" / "SOURCE.md").write_text(
        "# Wakefield Central Mosque\n\n"
        "Source: public Firestore on `wakefield-central-mosque` "
        "(site https://wakefieldcentralmosque.co.uk/).\n\n"
        "- Adhan / sunrise: `artifacts/masjid-connect-app/public/data/prayerCalendar/{DD}-{MM}`\n"
        "- Jamaat (Fajr/Zuhr/Asr/Isha/Jummah): live `.../prayerTimes/today` "
        f"(extracted values Fajr={jamaat.get('Fajr')}, Zuhr={jamaat.get('Zuhr')}, "
        f"Asr={jamaat.get('Asr')}, Isha={jamaat.get('Isha')}, Jummah={jummah_str})\n"
        "- Maghrib jamaat = Maghrib start (site `prayerTimetable.mjs`)\n\n"
        "Only days where live jamaat ≥ adhan are stored (Nov 19–30 + December 2026 "
        "at extraction time). Refresh when `prayerTimes/today` changes.\n"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    extract_zakariya()
    extract_swafia()
    extract_central()
    print("done")


if __name__ == "__main__":
    main()
