#!/usr/bin/env python3
"""Extract monthly prayer JSON from Dewsbury/Batley/Scunthorpe Salaah Times apps."""
from __future__ import annotations

import argparse
import json
import plistlib
import re
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date as date_cls
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques" / "gb"
UA = {"User-Agent": "Sheffield-Masjids/1.0 (salaah-times-app extract)"}

BATLEY_BASE = "https://batleysalaahtimes.com/api"
DEWSBURY_BASE = "https://dewsburysalaahtimes.com/management/api/v1/prayers"
# Runner.app (SCM Scunthorpe) caches dated keys in the App Group prefs.
SCM_PLIST = (
    Path.home()
    / "Library/Group Containers/group.homeScreenscm/Library/Preferences/group.homeScreenscm.plist"
)
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

def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def hhmm(value: str | None) -> str:
    if not value:
        return ""
    m = re.match(r"(\d{1,2}):(\d{2})", value.strip())
    if not m:
        return ""
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def build_month(payload: dict) -> dict | None:
    schedule = payload.get("monthly_schedule") or {}
    if not schedule:
        return None
    prayer_times = []
    iqamah_times = []
    friday_jummah: list[str] = []

    for date_key in sorted(schedule):
        day = int(date_key.split("-")[2])
        by_name = {row["prayer_name"].strip().lower(): row for row in schedule[date_key]}

        def start(name: str) -> str:
            return hhmm((by_name.get(name) or {}).get("start_time"))

        def jamaat(name: str) -> str:
            return hhmm((by_name.get(name) or {}).get("jamaat_time"))

        fajr_s, sun_s = start("fajr"), start("sunrise")
        dhuhr_s, asr_s = start("dhuhr"), start("asr")
        magh_s, isha_s = start("maghrib"), start("isha")
        if not all([fajr_s, sun_s, dhuhr_s, asr_s, magh_s, isha_s]):
            continue

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

        fajr_j = jamaat("fajr") or fajr_s
        dhuhr_j = jamaat("dhuhr") or dhuhr_s
        asr_j = jamaat("asr") or asr_s
        magh_j = jamaat("maghrib") or magh_s
        isha_j = jamaat("isha") or isha_s
        row = {
            "date_range": str(day),
            "fajr": fajr_j,
            "dhuhr": dhuhr_j,
            "asr": asr_j,
            "maghrib": magh_j,
            "isha": isha_j,
        }
        # Only set jummah from an explicit Friday Dhuhr jamaat (not begin/start).
        if date_cls.fromisoformat(date_key).weekday() == 4:
            jummah = jamaat("dhuhr")
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
    reg = json.loads((ROOT / "public/data/mosques.json").read_text())["mosques"]
    batley = {m["id"]: m for m in reg if m.get("citySlug") == "batley"}
    dewsbury = {m["id"]: m for m in reg if m.get("citySlug") == "dewsbury"}
    alias = {
        "al hashim academy": ("batley", "al-hashim-academy"),
        "al ihsan trust": ("batley", "al-ihsan-trust"),
        "dawatal islam mosque": ("batley", "dawatal-islam-mosque"),
        "jame masjid": ("batley", "jame-masjid"),
        "jumma masjid": ("batley", "jumma-masjid"),
        "madina masjid": ("batley", "madina-masjid"),
        "masjid ali": ("batley", "masjid-ali"),
        "masjid hilal": ("batley", "masjid-hilal"),
        "masjid mahmoodia": ("batley", "masjid-mahmoodia"),
        "masjid noor": ("batley", "masjid-noor"),
        "masjid noor ul islam": ("batley", "masjid-noor-ul-islam"),
        "masjid taqwa": ("batley", "masjid-taqwa"),
        # Published via Batley API but registry city is Dewsbury.
        "madressah al hira": ("dewsbury", "madressah-al-hira"),
        "madrasah al hira": ("dewsbury", "madressah-al-hira"),
    }

    def norm(s: str) -> str:
        s = re.sub(r"[^a-z0-9]+", " ", s.lower())
        return " ".join(s.split())

    out: dict[int, tuple[str, str]] = {}
    for m in mosques:
        n = norm(m["name"])
        mapped = alias.get(n)
        if not mapped:
            continue
        city, slug = mapped
        registry = batley if city == "batley" else dewsbury
        if slug in registry:
            out[int(m["id"])] = (city, slug)
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
            if payload.get("status") != "success":
                print(f"SKIP {slug} {month_token}: {payload}")
                continue
            built = build_month(payload)
            if not built:
                print(f"SKIP {slug} {month_token}: empty schedule")
                continue
            # Require reasonable coverage (at least half the month) to avoid partial junk.
            if len(built["prayer_times"]) < 14:
                print(f"SKIP {slug} {month_token}: only {len(built['prayer_times'])} days")
                continue
            path = out_dir / f"{MONTH_FILE[month]}.json"
            if not built["jummah_iqamah"] and path.exists():
                try:
                    prev = json.loads(path.read_text()).get("jummah_iqamah", "")
                except json.JSONDecodeError:
                    prev = ""
                if prev:
                    built["jummah_iqamah"] = prev
            # Leave jummah empty when the source has no Friday Dhuhr jamaat
            # (e.g. Al-Ihsan) — do not invent from weekday begin/iqamah.
            path.write_text(json.dumps(built, indent=2) + "\n")
            print(f"Wrote {path} ({len(built['prayer_times'])} days, jummah {built['jummah_iqamah']})")
            written.append(slug)
    return sorted(set(written))


def extract_scunthorpe(year: int, months: list[int], min_days: int = 7) -> list[str]:
    """Read Runner.app App Group cache into monthly JSON (partial months OK)."""
    if not SCM_PLIST.exists():
        print(f"SKIP {SCM_SLUG}: missing app cache {SCM_PLIST}")
        return []

    with SCM_PLIST.open("rb") as fh:
        data = plistlib.load(fh)

    pat = re.compile(
        r"^(\d{4})-(\d{2})-(\d{2})_(fajr|sunrise|zuhr|asr|maghrib|isha)(_jamat)?$"
    )
    by_month: dict[int, dict[int, dict[str, str]]] = defaultdict(lambda: defaultdict(dict))
    for key, value in data.items():
        m = pat.match(str(key))
        if not m:
            continue
        y, mo, day, prayer, jamat = m.groups()
        if int(y) != year:
            continue
        field = {"zuhr": "dhuhr", "sunrise": "shurooq"}.get(prayer, prayer)
        by_month[int(mo)][int(day)][field + ("_iqamah" if jamat else "")] = str(value)

    out_dir = DATA / SCM_CITY / SCM_SLUG
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for month in months:
        days = by_month.get(month, {})
        prayer_times = []
        iqamah_times = []
        friday_jummah: list[str] = []
        for day in sorted(days):
            row = days[day]
            needed = ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"]
            if not all(k in row for k in needed):
                continue
            prayer_times.append(
                {
                    "date": day,
                    "fajr": row["fajr"],
                    "shurooq": row["shurooq"],
                    "dhuhr": row["dhuhr"],
                    "asr": row["asr"],
                    "maghrib": row["maghrib"],
                    "isha": row["isha"],
                }
            )
            iq = {
                "date_range": str(day),
                "fajr": row.get("fajr_iqamah", row["fajr"]),
                "dhuhr": row.get("dhuhr_iqamah", row["dhuhr"]),
                "asr": row.get("asr_iqamah", row["asr"]),
                "maghrib": row.get("maghrib_iqamah", row["maghrib"]),
                "isha": row.get("isha_iqamah", row["isha"]),
            }
            if date_cls(year, month, day).weekday() == 4:
                friday_jummah.append(iq["dhuhr"])
            iqamah_times.append(iq)

        if len(prayer_times) < min_days:
            print(f"SKIP {SCM_SLUG} {year}-{month:02d}: only {len(prayer_times)} cached days")
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
        "--skip-scunthorpe",
        action="store_true",
        help="skip Runner.app App Group cache extract",
    )
    args = parser.parse_args()
    months = [int(x) for x in args.months.split(",") if x.strip()]

    batley_mosques = fetch_json(f"{BATLEY_BASE}/mosques.php")["data"]
    dewsbury_mosques = fetch_json(f"{DEWSBURY_BASE}/mosques.php")["data"]
    batley_map = rebuild_batley_map(batley_mosques)
    dewsbury_map = rebuild_dewsbury_map(dewsbury_mosques)
    print("Batley mapped:", batley_map)
    print("Dewsbury mapped:", dewsbury_map)

    slugs = []
    slugs += extract_city(BATLEY_BASE, batley_map, args.year, months)
    slugs += extract_city(DEWSBURY_BASE, dewsbury_map, args.year, months)
    if not args.skip_scunthorpe:
        slugs += extract_scunthorpe(args.year, months)
    print("Slugs updated:", ",".join(sorted(set(slugs))))


if __name__ == "__main__":
    main()
