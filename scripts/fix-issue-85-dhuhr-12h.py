#!/usr/bin/env python3
"""Fix obvious post-DST 12h mislabels: dhuhr 23:HH -> 11:HH in monthly JSON.

Also, when fajr drops ~1h day-over-day but dhuhr stays near 12:xx, subtract 1h
from dhuhr so the row is internally consistent with sibling adhan fields.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public/data/mosques"


def to_min(t: str) -> int | None:
    try:
        h, m = map(int, t.split(":"))
        return h * 60 + m
    except Exception:
        return None


def from_min(n: int) -> str:
    n = n % (24 * 60)
    return f"{n // 60:02d}:{n % 60:02d}"


def fix_month(path: Path) -> list[str]:
    data = json.loads(path.read_text())
    pts = sorted(data.get("prayer_times", []), key=lambda r: r["date"])
    changes: list[str] = []
    by_date = {r["date"]: r for r in pts}

    for row in pts:
        dhuhr = row.get("dhuhr", "")
        if isinstance(dhuhr, str) and dhuhr.startswith("23:"):
            fixed = "11:" + dhuhr[3:]
            changes.append(f"{path}: day {row['date']} dhuhr {dhuhr} -> {fixed}")
            row["dhuhr"] = fixed

    # Consistency: fajr fell ~60m from previous day, dhuhr did not
    for day in sorted(by_date):
        prev = by_date.get(day - 1)
        cur = by_date[day]
        if not prev:
            continue
        pf, cf = to_min(prev.get("fajr", "")), to_min(cur.get("fajr", ""))
        pd, cd = to_min(prev.get("dhuhr", "")), to_min(cur.get("dhuhr", ""))
        if None in (pf, cf, pd, cd):
            continue
        fajr_fall = pf - cf
        dhuhr_fall = pd - cd
        if 50 <= fajr_fall <= 70 and abs(dhuhr_fall) < 20 and 12 * 60 <= cd <= 13 * 60 + 30:
            fixed = from_min(cd - 60)
            changes.append(f"{path}: day {day} dhuhr {cur['dhuhr']} -> {fixed} (aligned with fajr DST drop)")
            cur["dhuhr"] = fixed

    if changes:
        data["prayer_times"] = pts
        path.write_text(json.dumps(data, indent=2) + "\n")
    return changes


def main() -> None:
    all_changes: list[str] = []
    for path in sorted(ROOT.rglob("october.json")):
        all_changes.extend(fix_month(path))
    for path in sorted(ROOT.rglob("november.json")):
        all_changes.extend(fix_month(path))
    print(f"changed_lines={len(all_changes)}")
    for line in all_changes:
        print(line)


if __name__ == "__main__":
    main()
