#!/usr/bin/env python3
"""Apply authorized #174 cell fixes and remaining #125 redbridge partial iqamah fields."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "data" / "mosques"


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def patch_iqamah(data: dict, day: str, fields: dict[str, str]) -> None:
    for row in data["iqamah_times"]:
        if row["date_range"] == day:
            row.update(fields)
            return
    raise KeyError(f"iqamah date_range {day} not found")


def patch_prayer(data: dict, day: int, fields: dict[str, str]) -> None:
    for row in data["prayer_times"]:
        if row["date"] == day:
            row.update(fields)
            return
    raise KeyError(f"prayer date {day} not found")


def upsert_iqamah_partial(data: dict, day: str, fields: dict[str, str]) -> None:
    for row in data["iqamah_times"]:
        if row["date_range"] == day:
            row.update(fields)
            return
    data["iqamah_times"].append({"date_range": day, **fields})
    data["iqamah_times"].sort(key=lambda r: int(str(r["date_range"]).split("-")[0]))


def fix_aisha() -> Path:
    path = ROOT / "gb/walsall/aisha-mosque-and-islamic-centre/november.json"
    data = load(path)
    patch_iqamah(data, "6", {"maghrib": "16:32"})
    patch_iqamah(data, "7", {"fajr": "06:45", "asr": "14:45", "maghrib": "16:30"})
    patch_iqamah(data, "9", {"maghrib": "16:27"})
    patch_iqamah(data, "10", {"maghrib": "16:25"})
    save(path, data)
    return path


def fix_bathgate() -> Path:
    path = ROOT / "gb/bathgate/bathgate-mosque/november.json"
    data = load(path)
    patch_iqamah(data, "10", {"isha": "18:45"})
    save(path, data)
    return path


def fix_madina_sheffield() -> Path:
    path = ROOT / "gb/sheffield/madina-masjid-sheffield/november.json"
    data = load(path)
    patch_iqamah(data, "5", {"isha": "19:00"})
    save(path, data)
    return path


def fix_madinat_al_zahra() -> Path:
    path = ROOT / "gb/bradford/madinat-al-zahra/november.json"
    data = load(path)
    data["jummah_iqamah"] = "13:00"
    save(path, data)
    return path


def fix_vali() -> Path:
    path = ROOT / "gb/blackburn/masjid-e-vali/november.json"
    data = load(path)
    patch_prayer(
        data,
        12,
        {"fajr": "05:46", "shurooq": "07:29", "isha": "18:00"},
    )
    patch_iqamah(data, "12", {"maghrib": "16:23", "isha": "19:00"})
    save(path, data)
    return path


def fix_redbridge_issue125() -> list[Path]:
    """Merge only explicitly published partial jamaat fields from #125."""
    rows = [
        ("october", "28", {"maghrib": "16:50"}),
        ("october", "29", {"maghrib": "16:48"}),
        ("october", "30", {"dhuhr": "12:30", "maghrib": "16:46"}),
        ("october", "31", {"dhuhr": "13:00", "maghrib": "16:44"}),
        ("november", "1", {"maghrib": "16:42"}),
        ("november", "2", {"maghrib": "16:41"}),
        ("november", "3", {"maghrib": "16:39"}),
        ("november", "4", {"maghrib": "16:37"}),
        ("november", "5", {"maghrib": "16:35"}),
        ("november", "6", {"fajr": "06:15", "dhuhr": "12:30", "asr": "15:00", "maghrib": "16:34"}),
        ("november", "7", {"dhuhr": "13:00", "maghrib": "16:32"}),
        ("november", "8", {"dhuhr": "13:00", "maghrib": "16:30"}),
        ("november", "9", {"maghrib": "16:29"}),
        ("november", "10", {"maghrib": "16:27"}),
        ("november", "11", {"maghrib": "16:26"}),
        ("november", "12", {"maghrib": "16:24"}),
        ("november", "13", {"fajr": "06:30", "dhuhr": "12:30", "asr": "14:45", "maghrib": "16:23"}),
        ("november", "14", {"dhuhr": "13:00", "maghrib": "16:21"}),
        ("november", "15", {"dhuhr": "13:00", "maghrib": "16:20"}),
        ("november", "16", {"maghrib": "16:19"}),
        ("november", "17", {"maghrib": "16:17"}),
        ("november", "18", {"maghrib": "16:16"}),
        ("november", "19", {"maghrib": "16:15"}),
        ("november", "20", {"fajr": "06:45", "dhuhr": "12:30", "maghrib": "16:14"}),
        ("november", "21", {"dhuhr": "13:00", "maghrib": "16:13"}),
        ("november", "22", {"dhuhr": "13:00", "maghrib": "16:12"}),
        ("november", "23", {"maghrib": "16:11"}),
        ("november", "24", {"maghrib": "16:10"}),
        ("november", "25", {"maghrib": "16:09"}),
        ("november", "26", {"maghrib": "16:08"}),
        ("november", "27", {"dhuhr": "12:30", "maghrib": "16:07"}),
        ("november", "28", {"dhuhr": "13:00", "maghrib": "16:06"}),
        ("november", "29", {"dhuhr": "13:00", "maghrib": "16:05"}),
        ("november", "30", {"maghrib": "16:05"}),
    ]
    written: list[Path] = []
    by_month: dict[str, dict] = {}
    for month, day, fields in rows:
        path = ROOT / "gb/ilford/redbridge-islamic-centre" / f"{month}.json"
        if month not in by_month:
            by_month[month] = load(path)
        upsert_iqamah_partial(by_month[month], day, fields)
    for month, data in by_month.items():
        path = ROOT / "gb/ilford/redbridge-islamic-centre" / f"{month}.json"
        save(path, data)
        written.append(path)
    return written


def main() -> None:
    written = [
        fix_aisha(),
        fix_bathgate(),
        fix_madina_sheffield(),
        fix_madinat_al_zahra(),
        fix_vali(),
        *fix_redbridge_issue125(),
    ]
    for path in written:
        print(f"updated {path.relative_to(ROOT.parents[2])}")


if __name__ == "__main__":
    main()
