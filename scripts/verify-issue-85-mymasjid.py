#!/usr/bin/env python3
"""Verify sandwell-grand-masjid / york-muslim-association vs my-masjid API.

Exits 0 when October+November adhan/iqamah match the API. Does not write files.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONTHS = {
    1: "january",
    2: "february",
    3: "march",
    4: "april",
    5: "may",
    6: "june",
    7: "july",
    8: "august",
    9: "september",
    10: "october",
    11: "november",
    12: "december",
}

MOSQUES = {
    "sandwell-grand-masjid": {
        "guid": "c131327c-ffda-4b50-9877-7608239a2bf6",
        "dir": ROOT / "public/data/mosques/gb/west-bromwich/sandwell-grand-masjid",
    },
    "york-muslim-association": {
        "guid": "0f90ea44-fefe-45b7-b9d1-2ec6f875d1dc",
        "dir": ROOT / "public/data/mosques/gb/york/york-muslim-association",
    },
}


def fetch(guid: str) -> dict:
    url = (
        "https://time.my-masjid.com/api/TimingsInfoScreen/"
        f"GetMasjidMultipleTimings?GuidId={guid}"
    )
    with urllib.request.urlopen(url, timeout=60) as resp:
        return json.load(resp)["model"]


def api_day(row: dict) -> dict:
    def t(arr, key="salahTime"):
        return arr[0][key] if arr and arr[0].get(key) else None

    return {
        "date": row["day"],
        "fajr": t(row["fajr"]),
        "shurooq": t(row["shouruq"]),
        "dhuhr": t(row["zuhr"]),
        "asr": t(row["asr"]),
        "maghrib": t(row["maghrib"]),
        "isha": t(row["isha"]),
        "iq": {
            "fajr": t(row["fajr"], "iqamahTime"),
            "dhuhr": t(row["zuhr"], "iqamahTime"),
            "asr": t(row["asr"], "iqamahTime"),
            "maghrib": t(row["maghrib"], "iqamahTime"),
            "isha": t(row["isha"], "iqamahTime"),
        },
    }


def load_static(path: Path):
    data = json.loads(path.read_text())
    pts = {d["date"]: d for d in data["prayer_times"]}
    iqs: dict[int, dict] = {}
    for e in data["iqamah_times"]:
        key = e["date_range"]
        if "-" in key:
            a, b = map(int, key.split("-"))
            for d in range(a, b + 1):
                iqs[d] = e
        else:
            iqs[int(key)] = e
    return pts, iqs


def main() -> int:
    diffs: list[str] = []
    for slug, meta in MOSQUES.items():
        model = fetch(meta["guid"])
        by_m: dict[int, list] = {}
        for row in model["salahTimings"]:
            by_m.setdefault(row["month"], []).append(row)
        for month in (10, 11):
            path = meta["dir"] / f"{MONTHS[month]}.json"
            if not path.exists():
                diffs.append(f"{slug} {MONTHS[month]}: missing file")
                continue
            pts, iqs = load_static(path)
            for row in sorted(by_m.get(month, []), key=lambda r: r["day"]):
                a = api_day(row)
                d = a["date"]
                s = pts.get(d)
                iq = iqs.get(d)
                if not s:
                    diffs.append(f"{slug} {MONTHS[month]} d{d}: missing prayer")
                    continue
                for f in ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"]:
                    if s.get(f) != a[f]:
                        diffs.append(
                            f"{slug} {MONTHS[month]} d{d} {f}: "
                            f"static={s.get(f)} api={a[f]}"
                        )
                if not iq:
                    diffs.append(f"{slug} {MONTHS[month]} d{d}: missing iqamah")
                    continue
                for f in ["fajr", "dhuhr", "asr", "maghrib", "isha"]:
                    if iq.get(f) != a["iq"][f]:
                        diffs.append(
                            f"{slug} {MONTHS[month]} d{d} iq.{f}: "
                            f"static={iq.get(f)} api={a['iq'][f]}"
                        )
    print(f"diffs={len(diffs)}")
    for line in diffs:
        print(line)
    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main())
