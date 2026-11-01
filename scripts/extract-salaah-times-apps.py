#!/usr/bin/env python3
"""Extract monthly prayer JSON for the Batley / Dewsbury / Scunthorpe mosques.

Each of the three iOS "Salaah Times" apps reads a public HTTP timetable, so this
sources the JSON from those endpoints directly rather than from the app builds:
  * Batley    -> batleysalaahtimes.com/api
  * Dewsbury  -> dewsburysalaahtimes.com/management/api/v1/prayers
  * Scunthorpe-> time.scunthorpemosque.co.uk/api/display/SCM (PrayDisplay)
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date as date_cls
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques" / "gb"
UA = {"User-Agent": "Sheffield-Masjids/1.0 (salaah-times-app extract)"}

BATLEY_BASE = "https://batleysalaahtimes.com/api"
DEWSBURY_BASE = "https://dewsburysalaahtimes.com/management/api/v1/prayers"
# Scunthorpe Central Mosque app talks to scmm.scunthorpecentral.com
# (/api/today-prayer-time, POST + auth-gated `type`), which only serves today.
# The mosque's own public PrayDisplay screen at time.scunthorpemosque.co.uk
# exposes the same timetable as a full month, so source from that instead of
# scraping the app's App Group cache.
SCM_DISPLAY_BASE = "https://time.scunthorpemosque.co.uk/api/display/SCM"
SCM_CITY = "scunthorpe"
SCM_SLUG = "scunthorpe-central-mosque"

MONTH_UPPER = {
    1: "JANUARY",
    2: "FEBRUARY",
    3: "MARCH",
    4: "APRIL",
    5: "MAY",
    6: "JUNE",
    7: "JULY",
    8: "AUGUST",
    9: "SEPTEMBER",
    10: "OCTOBER",
    11: "NOVEMBER",
    12: "DECEMBER",
}
MONTH_FILE = {n: name.lower() for n, name in MONTH_UPPER.items()}

def fetch_json(url: str, attempts: int = 3) -> dict:
    """GET a JSON feed, retrying transient TLS/connection failures."""
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == attempts:
                raise
            time.sleep(attempt)
    raise AssertionError("unreachable")


def hhmm(value: str | None) -> str:
    if not value:
        return ""
    m = re.match(r"(\d{1,2}):(\d{2})", value.strip())
    if not m:
        return ""
    return f"{int(m.group(1)):02d}:{m.group(2)}"


DHUHR_OPEN, DHUHR_CLOSE = 10 * 60, 15 * 60


def normalize_dhuhr(value: str) -> str:
    """Undo the Dewsbury feed's 12-hour conversion bug (`23:55` -> `11:55`)."""
    if not value:
        return ""
    hours, minutes = (int(part) for part in value.split(":"))
    if hours >= 20:                  # an AM time that had 12h added to it
        return f"{hours - 12:02d}:{minutes:02d}"
    return value


def assert_plausible(day: int, dhuhr: str) -> None:
    """Refuse a row whose Dhuhr is outside any real UK timetable slot."""
    hours, minutes = (int(part) for part in dhuhr.split(":"))
    if not DHUHR_OPEN <= hours * 60 + minutes <= DHUHR_CLOSE:
        raise ValueError(f"implausible Dhuhr {dhuhr} on day {day}")


def build_month(payload: dict, previous: dict | None = None) -> dict | None:
    """Build one month of repo JSON from a feed payload.

    `previous` is the month file already in the repo. The feeds leave some
    jamat cells blank (e.g. Al-Ihsan's Friday Dhuhr) and omit extra Jumu'ah
    sittings, so curated values are kept when the feed has nothing to say.
    """
    schedule = payload.get("monthly_schedule") or {}
    if not schedule:
        return None
    prayer_times = []
    iqamah_times = []
    friday_jummah: list[str] = []
    prev_iqamah = {
        row["date_range"]: row for row in (previous or {}).get("iqamah_times") or []
    }
    # Some feeds (Dewsbury Madrasah Islamiyah) omit the Dhuhr row entirely on
    # Fridays; the repo convention is to carry the previous day's Dhuhr across.
    last_dhuhr: tuple[str, str] | None = None

    for date_key in sorted(schedule):
        day = int(date_key.split("-")[2])
        is_friday = date_cls.fromisoformat(date_key).weekday() == 4
        by_name = {row["prayer_name"].strip().lower(): row for row in schedule[date_key]}
        prev_row = prev_iqamah.get(str(day), {})

        def start(name: str) -> str:
            return hhmm((by_name.get(name) or {}).get("start_time"))

        def jamaat(name: str) -> str:
            return hhmm((by_name.get(name) or {}).get("jamaat_time"))

        def jamaat_or_curated(name: str, fallback: str) -> str:
            published = jamaat(name)
            if published:
                return published
            return prev_row.get(name) or fallback

        fajr_s, sun_s = start("fajr"), start("sunrise")
        dhuhr_s, asr_s = normalize_dhuhr(start("dhuhr")), start("asr")
        magh_s, isha_s = start("maghrib"), start("isha")
        dhuhr_j_source = jamaat("dhuhr")
        carried_jamaat = ""
        if not dhuhr_s and is_friday and last_dhuhr:
            dhuhr_s, carried_jamaat = last_dhuhr
        if not all([fajr_s, sun_s, dhuhr_s, asr_s, magh_s, isha_s]):
            continue
        assert_plausible(day, dhuhr_s)
        last_dhuhr = (dhuhr_s, carried_jamaat or dhuhr_j_source or dhuhr_s)

        prayer_times.append(
            {
                "date": day,
                "fajr": fajr_s,
                "shurooq": sun_s,
                "dhuhr": dhuhr_s,
                "asr": asr_s,
                "maghrib": magh_s,
                "isha": isha_s,
            }
        )

        fajr_j = jamaat_or_curated("fajr", fajr_s)
        dhuhr_j = carried_jamaat or jamaat_or_curated("dhuhr", dhuhr_s)
        asr_j = jamaat_or_curated("asr", asr_s)
        magh_j = jamaat_or_curated("maghrib", magh_s)
        isha_j = jamaat_or_curated("isha", isha_s)
        row = {
            "date_range": str(day),
            "fajr": fajr_j,
            "dhuhr": dhuhr_j,
            "asr": asr_j,
            "maghrib": magh_j,
            "isha": isha_j,
        }
        # Only set jummah from an explicit Friday Dhuhr jamaat (not begin/start),
        # or from the carried one when the feed omits the Friday Dhuhr row.
        if is_friday:
            jummah = carried_jamaat or dhuhr_j_source
            previous_jummah = prev_row.get("jummah", "")
            if jummah and previous_jummah.startswith(jummah):
                jummah = previous_jummah     # feed omits extra sittings
            if jummah:
                row["jummah"] = jummah
                friday_jummah.append(jummah)
        iqamah_times.append(row)

    if not prayer_times:
        return None
    month_num = int(next(iter(schedule)).split("-")[1])
    # Prefer an explicit Friday jamaat. If the source leaves Friday Dhuhr jamaat
    # null (e.g. Al-Ihsan), do not invent from begin time — caller may preserve
    # an existing jummah_iqamah.
    jummah = friday_jummah[0] if friday_jummah else ""
    return {
        "month": MONTH_UPPER[month_num],
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def rebuild_dewsbury_map(mosques: list[dict]) -> dict[int, tuple[str, str]]:
    """Map Dewsbury API names onto registry slugs by normalized name."""
    reg = json.loads((ROOT / "public/data/mosques.json").read_text())["mosques"]
    dewsbury = [m for m in reg if m.get("citySlug") == "dewsbury"]

    def norm(s: str) -> str:
        s = s.lower()
        s = re.sub(r"[^a-z0-9]+", " ", s)
        s = s.replace("masjid e ", "masjid ")
        s = s.replace("madrasah ", "madressah ")
        return " ".join(s.split())

    alias = {
        "darul ilm": "darul-ilm",
        "madrasah al amanah": "madrasah-al-amanah",
        "madressah al amanah": "madrasah-al-amanah",
        "madrasah islamiyah": "madrasah-islamiyah-dewsbury",
        "madressah islamiyah": "madrasah-islamiyah-dewsbury",
        "masjid e abu bakr": "masjid-e-abu-bakr-dewsbury",
        "masjid abu bakr": "masjid-e-abu-bakr-dewsbury",
        "masjid e bilal": "masjid-e-bilal-dewsbury",
        "masjid bilal": "masjid-e-bilal-dewsbury",
        "masjid quba": "masjid-quba-thornhill",
        "zakaria masjid": "zakaria-masjid",
        "ilahi masjid": "ilahi-masjid",
        "islamic tarbiyah academy": "islamic-tarbiyah-academy",
        "madressah al hira": "madressah-al-hira",
        "madrasah al hira": "madressah-al-hira",
        "masjid salaam": "masjid-salaam",
        "masjid talha": "masjid-talha",
        "masjid uthman": "masjid-uthman",
        "masjid umar": "masjid-umar",
        "masjid e umar": "masjid-umar",
        # Skip Dale Street / other campuses unless registry has a distinct slug.
    }
    by_slug = {m["id"]: m for m in dewsbury}
    out: dict[int, tuple[str, str]] = {}
    for m in mosques:
        n = norm(m["name"])
        if "dale street" in n:
            continue
        slug = alias.get(n)
        if not slug:
            # fuzzy contains
            for key, val in alias.items():
                if key in n or n in key:
                    slug = val
                    break
        if slug and slug in by_slug:
            out[int(m["id"])] = ("dewsbury", slug)
    return out


def rebuild_batley_map(mosques: list[dict]) -> dict[int, tuple[str, str]]:
    """Map Batley API names onto registry slugs.

    The Batley feed also lists two Dewsbury mosques. *Masjid Quba* (Thornhill)
    is published by both feeds with slightly different jamat times, and the
    Dewsbury feed is authoritative, so it is skipped here. *Madressah Al Hira*
    appears only in the Batley feed and is mapped across to its Dewsbury slug.
    """
    reg = json.loads((ROOT / "public/data/mosques.json").read_text())["mosques"]
    batley_slugs = {m["id"] for m in reg if m.get("citySlug") == "batley"}
    dewsbury_slugs = {m["id"] for m in reg if m.get("citySlug") == "dewsbury"}
    alias = {
        "al hashim academy": "al-hashim-academy",
        "al ihsan trust": "al-ihsan-trust",
        "dawatal islam mosque": "dawatal-islam-mosque",
        "jame masjid": "jame-masjid",
        "jumma masjid": "jumma-masjid",
        "madina masjid": "madina-masjid",
        "masjid ali": "masjid-ali",
        "masjid hilal": "masjid-hilal",
        "masjid mahmoodia": "masjid-mahmoodia",
        "masjid noor": "masjid-noor",
        "masjid noor ul islam": "masjid-noor-ul-islam",
        "masjid taqwa": "masjid-taqwa",
    }
    cross_listed = {
        "madressah al hira": "madressah-al-hira",
        "madrasah al hira": "madressah-al-hira",
    }

    def norm(s: str) -> str:
        s = re.sub(r"[^a-z0-9]+", " ", s.lower())
        return " ".join(s.split())

    out: dict[int, tuple[str, str]] = {}
    for m in mosques:
        name = norm(m["name"])
        slug = cross_listed.get(name)
        if slug in dewsbury_slugs:
            out[int(m["id"])] = ("dewsbury", slug)
            continue
        slug = alias.get(name)
        if slug in batley_slugs:
            out[int(m["id"])] = ("batley", slug)
    return out


def extract_city(base: str, mapping: dict[int, tuple[str, str]], year: int, months: list[int]) -> list[str]:
    written: list[str] = []
    for mosque_id, (city, slug) in sorted(mapping.items()):
        out_dir = DATA / city / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        for month in months:
            month_token = f"{year}-{month:02d}"
            url = f"{base}/monthly-timetable.php?{urllib.parse.urlencode({'mosque_id': mosque_id, 'month': month_token})}"
            try:
                payload = fetch_json(url)
            except urllib.error.HTTPError as err:
                print(f"SKIP {slug} {month_token}: HTTP {err.code}")
                continue
            except urllib.error.URLError as err:
                print(f"SKIP {slug} {month_token}: {err}")
                continue
            if payload.get("status") != "success":
                print(f"SKIP {slug} {month_token}: {payload}")
                continue
            path = out_dir / f"{MONTH_FILE[month]}.json"
            previous = None
            if path.exists():
                try:
                    previous = json.loads(path.read_text())
                except json.JSONDecodeError:
                    previous = None
            try:
                built = build_month(payload, previous)
            except ValueError as err:
                print(f"SKIP {slug} {month_token}: {err}")
                continue
            if not built:
                print(f"SKIP {slug} {month_token}: empty schedule")
                continue
            # Require reasonable coverage (at least half the month) to avoid partial junk.
            if len(built["prayer_times"]) < 14:
                print(f"SKIP {slug} {month_token}: only {len(built['prayer_times'])} days")
                continue
            if not built["jummah_iqamah"] and previous:
                built["jummah_iqamah"] = previous.get("jummah_iqamah", "")
            # Leave jummah empty when the source has no Friday Dhuhr jamaat
            # (e.g. Al-Ihsan) — do not invent from weekday begin/iqamah.
            path.write_text(json.dumps(built, indent=2) + "\n")
            print(f"Wrote {path} ({len(built['prayer_times'])} days, jummah {built['jummah_iqamah']})")
            written.append(slug)
    return sorted(set(written))


def extract_scunthorpe(year: int, months: list[int], min_days: int = 7) -> list[str]:
    """Read the mosque's public PrayDisplay monthly feed into monthly JSON.

    `jummahTime` in the feed is the Friday Dhuhr *start*, not the iqamah, so
    Jumu'ah is taken from that day's Dhuhr iqamah. Partial months are fine.
    """
    out_dir = DATA / SCM_CITY / SCM_SLUG
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for month in months:
        try:
            payload = fetch_json(f"{SCM_DISPLAY_BASE}/monthly?month={month}&year={year}")
        except urllib.error.HTTPError as err:
            print(f"SKIP {SCM_SLUG} {year}-{month:02d}: HTTP {err.code}")
            continue
        except (urllib.error.URLError, json.JSONDecodeError) as err:
            print(f"SKIP {SCM_SLUG} {year}-{month:02d}: {err}")
            continue

        prayer_times = []
        iqamah_times = []
        friday_jummah: list[str] = []
        for row in payload.get("times") or []:
            day = int(row["day"])
            adhan = {
                "fajr": hhmm(row.get("fajrStart")),
                "shurooq": hhmm(row.get("sunrise")),
                "dhuhr": hhmm(row.get("dhuhrStart")),
                "asr": hhmm(row.get("asrStart")),
                "maghrib": hhmm(row.get("maghribStart")),
                "isha": hhmm(row.get("ishaStart")),
            }
            if not all(adhan.values()):
                continue
            prayer_times.append({"date": day, **adhan})

            # Fall back to the adhan when an iqamah cell is blank.
            iq = {
                "date_range": str(day),
                "fajr": hhmm(row.get("fajrIqamah")) or adhan["fajr"],
                "dhuhr": hhmm(row.get("dhuhrIqamah")) or adhan["dhuhr"],
                "asr": hhmm(row.get("asrIqamah")) or adhan["asr"],
                "maghrib": hhmm(row.get("maghribIqamah")) or adhan["maghrib"],
                "isha": hhmm(row.get("ishaIqamah")) or adhan["isha"],
            }
            if date_cls(year, month, day).weekday() == 4:
                friday_jummah.append(iq["dhuhr"])
            iqamah_times.append(iq)

        if len(prayer_times) < min_days:
            print(f"SKIP {SCM_SLUG} {year}-{month:02d}: only {len(prayer_times)} published days")
            continue

        # Prefer first Friday in the month (pre-DST when clocks change mid-month).
        jummah = friday_jummah[0] if friday_jummah else ""
        built = {
            "month": MONTH_UPPER[month],
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        }
        path = out_dir / f"{MONTH_FILE[month]}.json"
        path.write_text(json.dumps(built, indent=2) + "\n")
        print(f"Wrote {path} ({len(prayer_times)} days, jummah {jummah})")
        written.append(SCM_SLUG)
    return sorted(set(written))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--months", default="10", help="comma-separated month numbers, e.g. 10,11")
    parser.add_argument(
        "--skip-batley", action="store_true", help="skip the batleysalaahtimes.com API"
    )
    parser.add_argument(
        "--skip-dewsbury",
        action="store_true",
        help="skip the dewsburysalaahtimes.com management API",
    )
    parser.add_argument(
        "--skip-scunthorpe",
        action="store_true",
        help="skip the Scunthorpe PrayDisplay monthly feed",
    )
    args = parser.parse_args()
    months = [int(x) for x in args.months.split(",") if x.strip()]

    slugs = []
    if not args.skip_batley:
        batley_map = rebuild_batley_map(fetch_json(f"{BATLEY_BASE}/mosques.php")["data"])
        print("Batley mapped:", batley_map)
        slugs += extract_city(BATLEY_BASE, batley_map, args.year, months)

    if not args.skip_dewsbury:
        dewsbury_map = rebuild_dewsbury_map(
            fetch_json(f"{DEWSBURY_BASE}/mosques.php")["data"]
        )
        print("Dewsbury mapped:", dewsbury_map)
        slugs += extract_city(DEWSBURY_BASE, dewsbury_map, args.year, months)

    if not args.skip_scunthorpe:
        slugs += extract_scunthorpe(args.year, months)

    print("Slugs updated:", ",".join(sorted(set(slugs))))


if __name__ == "__main__":
    main()
