#!/usr/bin/env python3
"""Apply the 13 confirmed cell fixes from issue #179.

Only the exact cells listed in the issue are touched. Each value was
re-verified against the live publisher before this script was written:

- MasjidBox REDUX_STATE 7-day window (aisha, bathgate, ilford, sultan-bahu)
- Mawaqit confData iqamaCalendar (madina-masjid-sheffield)
- Masjid E Vali November 2026 PDF, read visually as PNG pages
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "data" / "mosques" / "gb"


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def patch_iqamah(data: dict, day: str, fields: dict[str, str]) -> None:
    for row in data["iqamah_times"]:
        if row["date_range"] == day:
            before = {k: row[k] for k in fields}
            if before == fields:
                raise KeyError(f"iqamah {day} already {fields}")
            row.update(fields)
            return
    raise KeyError(f"iqamah date_range {day} not found")


def patch_prayer(data: dict, day: int, fields: dict[str, str]) -> None:
    for row in data["prayer_times"]:
        if row["date"] == day:
            before = {k: row[k] for k in fields}
            if before == fields:
                raise KeyError(f"prayer {day} already {fields}")
            row.update(fields)
            return
    raise KeyError(f"prayer date {day} not found")


def fix_aisha() -> Path:
    path = ROOT / "walsall/aisha-mosque-and-islamic-centre/november.json"
    data = load(path)
    patch_iqamah(data, "12", {"maghrib": "16:22"})
    save(path, data)
    return path


def fix_bathgate() -> Path:
    path = ROOT / "bathgate/bathgate-mosque/november.json"
    data = load(path)
    patch_iqamah(data, "11", {"isha": "18:45"})
    patch_iqamah(data, "12", {"isha": "18:45"})
    save(path, data)
    return path


def fix_ilford() -> Path:
    path = ROOT / "ilford/ilford-islamic-centre/november.json"
    data = load(path)
    patch_iqamah(data, "7", {"fajr": "06:30"})
    patch_iqamah(data, "11", {"dhuhr": "13:15"})
    patch_iqamah(data, "12", {"dhuhr": "13:15"})
    save(path, data)
    return path


def fix_madina_sheffield() -> Path:
    path = ROOT / "sheffield/madina-masjid-sheffield/november.json"
    data = load(path)
    patch_iqamah(data, "6", {"isha": "19:00"})
    save(path, data)
    return path


def fix_vali() -> Path:
    path = ROOT / "blackburn/masjid-e-vali/november.json"
    data = load(path)
    patch_prayer(data, 13, {"shurooq": "07:31", "asr": "14:27"})
    patch_iqamah(data, "13", {"maghrib": "16:21", "isha": "19:00"})
    save(path, data)
    return path


def fix_sultan_bahu() -> Path:
    path = ROOT / "bradford/sultan-bahu-bradford/november.json"
    data = load(path)
    patch_iqamah(data, "11", {"fajr": "06:15"})
    patch_iqamah(data, "12", {"fajr": "06:15"})
    save(path, data)
    return path


def main() -> None:
    written = [
        fix_aisha(),
        fix_bathgate(),
        fix_ilford(),
        fix_madina_sheffield(),
        fix_vali(),
        fix_sultan_bahu(),
    ]
    for path in written:
        print(f"updated {path.relative_to(ROOT.parents[2])}")


if __name__ == "__main__":
    main()
