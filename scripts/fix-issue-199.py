#!/usr/bin/env python3
"""Apply confirmed cell fixes from GitHub issue #199.

Quba Nov 13–19 Isha iqamah already fixed in PR #198. This script patches the
remaining verified cells only. Vali Nov 20 is applied after vision confirmation
of the official PDF.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "data" / "mosques" / "gb"


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def patch_iqamah(data: dict, day: str, fields: dict[str, str]) -> list[str]:
    notes: list[str] = []
    for row in data["iqamah_times"]:
        if str(row["date_range"]) == day:
            for k, v in fields.items():
                old = row.get(k)
                if old == v:
                    notes.append(f"iqamah {day} {k}: already {v}")
                else:
                    notes.append(f"iqamah {day} {k}: {old} -> {v}")
                    row[k] = v
            return notes
    raise KeyError(f"iqamah date_range {day} not found")


def patch_prayer(data: dict, day: int, fields: dict[str, str]) -> list[str]:
    notes: list[str] = []
    for row in data["prayer_times"]:
        if row["date"] == day:
            for k, v in fields.items():
                old = row.get(k)
                if old == v:
                    notes.append(f"prayer {day} {k}: already {v}")
                else:
                    notes.append(f"prayer {day} {k}: {old} -> {v}")
                    row[k] = v
            return notes
    raise KeyError(f"prayer date {day} not found")


def main() -> None:
    changed: list[Path] = []

    # 1. Aisha — Nov 18 adhan isha 17:13 -> 17:33
    path = ROOT / "walsall/aisha-mosque-and-islamic-centre/november.json"
    data = load(path)
    print(path.relative_to(ROOT.parent.parent.parent), *patch_prayer(data, 18, {"isha": "17:33"}), sep="\n  ")
    save(path, data)
    changed.append(path)

    # 2. Al-Ihsan Trust — Nov 14–20 iqamah asr 15:00 -> 14:45
    path = ROOT / "batley/al-ihsan-trust/november.json"
    data = load(path)
    notes = []
    for d in range(14, 21):
        notes.extend(patch_iqamah(data, str(d), {"asr": "14:45"}))
    print(path.name, *notes, sep="\n  ")
    save(path, data)
    changed.append(path)

    # 3. Bathgate — Nov 18–19 iqamah isha 19:00 -> 18:45
    path = ROOT / "bathgate/bathgate-mosque/november.json"
    data = load(path)
    notes = []
    for d in (18, 19):
        notes.extend(patch_iqamah(data, str(d), {"isha": "18:45"}))
    print(path.name, *notes, sep="\n  ")
    save(path, data)
    changed.append(path)

    # 4. Hanfia — Nov 19 iqamah isha only (preserve adhan holds)
    path = ROOT / "sheffield/hanfia-masjid-and-islamic-cultural-centre/november.json"
    data = load(path)
    print(path.name, *patch_iqamah(data, "19", {"isha": "18:30"}), sep="\n  ")
    save(path, data)
    changed.append(path)

    # 5. Ilford — Nov 14–19 fajr iqamah 06:45; Nov 19 dhuhr 13:15 (not Nov 20)
    path = ROOT / "ilford/ilford-islamic-centre/november.json"
    data = load(path)
    notes = []
    for d in range(14, 20):
        notes.extend(patch_iqamah(data, str(d), {"fajr": "06:45"}))
    notes.extend(patch_iqamah(data, "19", {"dhuhr": "13:15"}))
    print(path.name, *notes, sep="\n  ")
    save(path, data)
    changed.append(path)

    # 6. Masjid Al-Hikmah — Nov 20 iqamah isha 20:00 -> 20:15
    path = ROOT / "aberdeen/masjid-al-hikmah/november.json"
    data = load(path)
    print(path.name, *patch_iqamah(data, "20", {"isha": "20:15"}), sep="\n  ")
    save(path, data)
    changed.append(path)

    # 7. Masjid E Vali — Nov 20 (vision-confirmed from official PDF)
    path = ROOT / "blackburn/masjid-e-vali/november.json"
    data = load(path)
    notes = []
    notes.extend(patch_prayer(data, 20, {"fajr": "05:59", "shurooq": "07:44"}))
    notes.extend(patch_iqamah(data, "20", {"maghrib": "16:11", "isha": "19:00"}))
    print(path.name, *notes, sep="\n  ")
    save(path, data)
    changed.append(path)

    # 8. Masjid Mahmoodia — Nov 20 fajr iqamah 07:15 -> 07:10
    path = ROOT / "batley/masjid-mahmoodia/november.json"
    data = load(path)
    print(path.name, *patch_iqamah(data, "20", {"fajr": "07:10"}), sep="\n  ")
    save(path, data)
    changed.append(path)

    # 9. MWHT London — Nov 20 asr iqamah 14:00 -> 14:15
    path = ROOT / "london/muslim-welfare-house-london/november.json"
    data = load(path)
    print(path.name, *patch_iqamah(data, "20", {"asr": "14:15"}), sep="\n  ")
    save(path, data)
    changed.append(path)

    # 10. Neeli — Nov 18–19 asr iqamah 14:40 -> 14:45
    path = ROOT / "rochdale/neeli-mosque-rochdale/november.json"
    data = load(path)
    notes = []
    for d in (18, 19):
        notes.extend(patch_iqamah(data, str(d), {"asr": "14:45"}))
    print(path.name, *notes, sep="\n  ")
    save(path, data)
    changed.append(path)

    # 11. Sultan Bahu — Nov 19 only (do not extend to Nov 20)
    path = ROOT / "bradford/sultan-bahu-bradford/november.json"
    data = load(path)
    print(
        path.name,
        *patch_iqamah(data, "19", {"fajr": "06:45", "asr": "15:00"}),
        sep="\n  ",
    )
    save(path, data)
    changed.append(path)

    print(f"\nUpdated {len(changed)} files")


if __name__ == "__main__":
    main()
