#!/usr/bin/env python3
"""Fix audited prayer mismatches from issues #249 and #251.

#251 MasjidBox cells verified via api.masjidbox.com landing/athany (Europe/London).
Hanfia adhan and Fatima Isha iqamah holds from the issue are preserved.
#249 Wybourn homepage cards + Baitul Mukarram Firestore live document.
"""
from __future__ import annotations

import json
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
LONDON = ZoneInfo("Europe/London")
APIKEY = "JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px"
UA = {"User-Agent": "sheffield-masjids/1.0"}

MONTHS = [
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

MASJIDBOX = {
    "aisha-mosque-and-islamic-centre": ("walsall", "aisha-mosque-walsall"),
    "bathgate-mosque": ("bathgate", "bathgatemosque"),
    "fatima-community-centre": ("sheffield", "fatima-community-centre-1754779129430"),
    "hanfia-masjid-and-islamic-cultural-centre": (
        "sheffield",
        "hanfia-masjid-and-islamic-cultural-centre",
    ),
    "ilford-islamic-centre": ("ilford", "ilfordmosque"),
    "muhammadi-masjid": ("bradford", "muhammadimasjid-bradford"),
    "sheffield-grand-mosque": ("sheffield", "sheffield-grand-mosque-1696948767583"),
    "sultan-bahu-bradford": ("bradford", "sultan-bahu-bradford"),
}

# Fields we are allowed to sync from the live window for each mosque.
# Hanfia: iqamah isha only (adhan hold). Fatima: fajr/dhuhr/asr iqamah only (isha hold).
ALLOWED = {
    "aisha-mosque-and-islamic-centre": {("adhan", "isha")},
    "bathgate-mosque": {("iqamah", "isha")},
    "fatima-community-centre": {
        ("iqamah", "fajr"),
        ("iqamah", "dhuhr"),
        ("iqamah", "asr"),
    },
    "hanfia-masjid-and-islamic-cultural-centre": {("iqamah", "isha")},
    "ilford-islamic-centre": {("iqamah", "dhuhr"), ("jummah", "")},
    "muhammadi-masjid": {("iqamah", "isha")},
    "sheffield-grand-mosque": {("iqamah", "asr")},
    "sultan-bahu-bradford": {
        ("iqamah", "fajr"),
        ("iqamah", "dhuhr"),
        ("iqamah", "asr"),
        ("iqamah", "isha"),
    },
}


def hhmm(v: str | None) -> str:
    if not v:
        return ""
    return datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(LONDON).strftime("%H:%M")


def fetch_masjidbox(slug: str, begin: str) -> list[dict]:
    url = (
        f"https://api.masjidbox.com/1.0/masjidbox/landing/athany/{slug}"
        f"?get=at&days=7&begin={begin}"
    )
    req = urllib.request.Request(url, headers={**UA, "apikey": APIKEY})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.load(resp).get("timetable") or []


def load_month(city: str, mosque_id: str, month: str) -> tuple[Path, dict]:
    path = ROOT / "public/data/mosques/gb" / city / mosque_id / f"{month}.json"
    return path, json.loads(path.read_text())


def save_month(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n")


def get_iqamah_row(month: dict, day: int) -> dict | None:
    for row in month.get("iqamah_times") or []:
        dr = str(row.get("date_range", ""))
        if "-" in dr:
            a, b = map(int, dr.split("-", 1))
            if a <= day <= b:
                return row
        elif dr == str(day):
            return row
    return None


def get_prayer_row(month: dict, day: int) -> dict | None:
    return next((p for p in month.get("prayer_times") or [] if p["date"] == day), None)


def patch_masjidbox() -> list[str]:
    changes: list[str] = []
    for mosque_id, (city, slug) in MASJIDBOX.items():
        days: dict[str, dict] = {}
        for begin in ("2026-11-27", "2026-12-01"):
            for t in fetch_masjidbox(slug, begin):
                d = t["date"][:10]
                iq = t.get("iqamah") or {}
                days[d] = {
                    "adhan": {
                        "fajr": hhmm(t.get("fajr")),
                        "shurooq": hhmm(t.get("sunrise")),
                        "dhuhr": hhmm(t.get("dhuhr")),
                        "asr": hhmm(t.get("asr")),
                        "maghrib": hhmm(t.get("maghrib")),
                        "isha": hhmm(t.get("isha")),
                    },
                    "iqamah": {
                        "fajr": hhmm(iq.get("fajr")),
                        "dhuhr": hhmm(iq.get("dhuhr")),
                        "asr": hhmm(iq.get("asr")),
                        "maghrib": hhmm(iq.get("maghrib")),
                        "isha": hhmm(iq.get("isha")),
                    },
                    "jumuah": [hhmm(x) for x in (iq.get("jumuah") or [])],
                }

        allowed = ALLOWED[mosque_id]
        touched_paths: set[Path] = set()
        for ds, live in sorted(days.items()):
            y, m, d = map(int, ds.split("-"))
            path, month = load_month(city, mosque_id, MONTHS[m])
            changed = False

            if ("jummah", "") in allowed and live["jumuah"]:
                live_j = " / ".join(live["jumuah"])
                if month.get("jummah_iqamah") != live_j:
                    old = month.get("jummah_iqamah")
                    month["jummah_iqamah"] = live_j
                    changes.append(f"{mosque_id} {MONTHS[m]} jummah {old} -> {live_j}")
                    changed = True

            prayer = get_prayer_row(month, d)
            if prayer:
                for field in ("fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"):
                    if ("adhan", field) not in allowed:
                        continue
                    new = live["adhan"].get(field)
                    if new and prayer.get(field) != new:
                        changes.append(
                            f"{mosque_id} {ds} adhan.{field} {prayer.get(field)} -> {new}"
                        )
                        prayer[field] = new
                        changed = True

            iq_row = get_iqamah_row(month, d)
            if iq_row:
                for field in ("fajr", "dhuhr", "asr", "maghrib", "isha"):
                    if ("iqamah", field) not in allowed:
                        continue
                    new = live["iqamah"].get(field)
                    if new and iq_row.get(field) != new:
                        changes.append(
                            f"{mosque_id} {ds} iqamah.{field} {iq_row.get(field)} -> {new}"
                        )
                        iq_row[field] = new
                        changed = True

            if changed:
                save_month(path, month)
                touched_paths.add(path)

        print(f"{mosque_id}: wrote {len(touched_paths)} file(s)")
    return changes


def patch_wybourn() -> list[str]:
    """Homepage today cards for 2026-11-27."""
    path, month = load_month("sheffield", "wybourn-islamic-centre", "november")
    changes: list[str] = []
    prayer = get_prayer_row(month, 27)
    iq = get_iqamah_row(month, 27)
    assert prayer and iq
    patches = [
        (prayer, "dhuhr", "11:54"),
        (iq, "dhuhr", "12:45"),
        (iq, "maghrib", "16:03"),
    ]
    for row, field, new in patches:
        old = row[field]
        if old != new:
            row[field] = new
            kind = "adhan" if row is prayer else "iqamah"
            changes.append(f"wybourn-islamic-centre 2026-11-27 {kind}.{field} {old} -> {new}")
    if changes:
        save_month(path, month)
    return changes


def patch_baitul() -> list[str]:
    """Firestore live document (updated 2026-11-27) for dual Jumuah."""
    changes: list[str] = []
    url = (
        "https://firestore.googleapis.com/v1/projects/jellylabsprojects/"
        "databases/baitulmukarram/documents/prayertimes/times"
    )
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as resp:
        fields = json.load(resp)["fields"]
    jummah = f"{fields['jumma1']['stringValue']} / {fields['jumma2']['stringValue']}"
    # Update current and next month congregation Jumuah; daily-only feed cannot
    # backfill a full iqamah month.
    for month_name in ("november", "december"):
        path, month = load_month("sheffield", "baitul-mukarram-sheffield", month_name)
        old = month.get("jummah_iqamah")
        if old != jummah:
            month["jummah_iqamah"] = jummah
            save_month(path, month)
            changes.append(
                f"baitul-mukarram-sheffield {month_name} jummah {old} -> {jummah}"
            )
    return changes


def verify_issue_targets() -> None:
    targets = [
        ("walsall", "aisha-mosque-and-islamic-centre", "december", 3, "adhan", "isha", "17:18"),
        ("bathgate", "bathgate-mosque", "december", 3, "iqamah", "isha", "18:45"),
        ("sheffield", "fatima-community-centre", "december", 3, "iqamah", "fajr", "06:45"),
        ("sheffield", "fatima-community-centre", "december", 3, "iqamah", "dhuhr", "12:30"),
        ("sheffield", "fatima-community-centre", "december", 3, "iqamah", "asr", "14:15"),
        (
            "sheffield",
            "hanfia-masjid-and-islamic-cultural-centre",
            "december",
            3,
            "iqamah",
            "isha",
            "18:30",
        ),
        ("ilford", "ilford-islamic-centre", "november", None, "jummah", "", "13:00 / 13:45"),
        ("ilford", "ilford-islamic-centre", "november", 28, "iqamah", "dhuhr", "13:00"),
        ("ilford", "ilford-islamic-centre", "december", 1, "iqamah", "dhuhr", "13:00"),
        ("ilford", "ilford-islamic-centre", "december", 2, "iqamah", "dhuhr", "13:00"),
        ("bradford", "muhammadi-masjid", "december", 3, "iqamah", "isha", "19:00"),
        ("sheffield", "sheffield-grand-mosque", "december", 3, "iqamah", "asr", "14:15"),
        ("bradford", "sultan-bahu-bradford", "december", 3, "iqamah", "fajr", "07:00"),
        ("bradford", "sultan-bahu-bradford", "december", 3, "iqamah", "dhuhr", "13:00"),
        ("bradford", "sultan-bahu-bradford", "december", 3, "iqamah", "asr", "15:00"),
        ("bradford", "sultan-bahu-bradford", "december", 3, "iqamah", "isha", "18:30"),
        ("sheffield", "wybourn-islamic-centre", "november", 27, "adhan", "dhuhr", "11:54"),
        ("sheffield", "wybourn-islamic-centre", "november", 27, "iqamah", "dhuhr", "12:45"),
        ("sheffield", "wybourn-islamic-centre", "november", 27, "iqamah", "maghrib", "16:03"),
        (
            "sheffield",
            "baitul-mukarram-sheffield",
            "november",
            None,
            "jummah",
            "",
            "12:45 / 13:30",
        ),
    ]
    failed = 0
    for city, mid, month_name, day, kind, field, expected in targets:
        _, month = load_month(city, mid, month_name)
        if kind == "jummah":
            got = month.get("jummah_iqamah")
        elif kind == "adhan":
            got = (get_prayer_row(month, day) or {}).get(field)
        else:
            got = (get_iqamah_row(month, day) or {}).get(field)
        ok = got == expected
        print(("OK" if ok else "FAIL"), mid, month_name, day, kind, field or "jummah", got)
        if not ok:
            failed += 1
    if failed:
        raise SystemExit(f"{failed} verification failures")


def main() -> None:
    changes = []
    changes.extend(patch_masjidbox())
    changes.extend(patch_wybourn())
    changes.extend(patch_baitul())
    print(f"\n{len(changes)} cell updates")
    for c in changes:
        print(" ", c)
    print("\nVerifying issue targets...")
    verify_issue_targets()
    print("All issue targets OK")


if __name__ == "__main__":
    main()
