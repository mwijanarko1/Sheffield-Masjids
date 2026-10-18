#!/usr/bin/env python3
"""Re-extract Oct/Nov 2026 for Huddersfield Nicsol mosques (issue #85).

Fixes asr iqamah drift and 23:56 dhuhr 12h mislabels from the API.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

API_BASE = "https://ptp.nicsol.co.uk/public/api/v1"
API_TOKEN = "959953737ae1f5b1240d4776aa13ba17f358140a479a07f17a8114fa49cab186"
YEAR = 2026
HEADERS = {
    "Accept": "application/json",
    "Authorization": f"Bearer {API_TOKEN}",
    "User-Agent": "Mozilla/5.0 (compatible; Sheffield-Masjids/1.0)",
}

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public/data/mosques/gb/huddersfield"

# Explicit slug mapping (do not rely on name slugify for Omar etc.)
TARGETS = {
    5: "masjid-abu-bakr-huddersfield",
    2: "masjid-bilal-huddersfield",
    6: "masjid-ibrahim-huddersfield",
    13: "masjid-iman-huddersfield",
    3: "masjid-shah-jalal-huddersfield",
    4: "masjid-usman-huddersfield",
}

MONTH_NAMES = {
    10: "OCTOBER",
    11: "NOVEMBER",
}
MONTH_FILES = {
    10: "october.json",
    11: "november.json",
}
MONTH_DAYS = {10: 31, 11: 30}


def discover_omar_id() -> int | None:
    """Find Masjid Omar mosqueId from area 1 listing."""
    url = f"{API_BASE}/prayer-times/mosques/1"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode())
    for m in data.get("mosques", []):
        name = (m.get("name") or "").lower()
        if "omar" in name or "umar" in name:
            print(f"  discovered Omar: id={m['id']} name={m['name']}")
            return int(m["id"])
    print("  WARNING: could not discover Omar mosque id")
    return None


def fix_12h_bug(t: str) -> str:
    """API sometimes returns dhuhr as 23:56 instead of 11:56."""
    if not t or ":" not in t:
        return t
    h, m = t.split(":", 1)
    try:
        hour = int(h)
    except ValueError:
        return t
    if hour >= 23:
        return f"{hour - 12:02d}:{m}"
    return t


def fetch_day(mosque_id: int, date_str: str) -> dict | None:
    url = (
        f"{API_BASE}/prayer-times/by-date-mosque"
        f"?mosqueId={mosque_id}&date={date_str}"
    )
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
        pts = data.get("prayer_times") or []
        return pts[0] if pts else None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, IndexError):
        return None


def fetch_month(mosque_id: int, month: int) -> dict[str, dict]:
    days = MONTH_DAYS[month]
    dates = [f"{YEAR}-{month:02d}-{d:02d}" for d in range(1, days + 1)]
    results: dict[str, dict] = {}
    batch_size = 15
    for i in range(0, len(dates), batch_size):
        batch = dates[i : i + batch_size]
        with ThreadPoolExecutor(max_workers=batch_size) as ex:
            futures = {ex.submit(fetch_day, mosque_id, dt): dt for dt in batch}
            for fut in as_completed(futures):
                dt = futures[fut]
                try:
                    row = fut.result()
                    if row:
                        results[dt] = row
                except Exception:
                    pass
        time.sleep(0.05)
    return results


def build_month_json(all_days: dict[str, dict], month: int) -> dict:
    prayer_times = []
    iqamah_times = []
    jummah = None

    for date_str in sorted(all_days):
        day_data = all_days[date_str]
        dt = date.fromisoformat(date_str)
        day_num = dt.day

        dhuhr = fix_12h_bug(day_data.get("dhuhr_begin", ""))
        dhuhr_j = fix_12h_bug(day_data.get("dhuhr_jamah", ""))

        prayer_times.append(
            {
                "date": day_num,
                "fajr": day_data["fajr_begin"],
                "shurooq": day_data["sunrise"],
                "dhuhr": dhuhr,
                "asr": day_data["asr_begin"],
                "maghrib": day_data["maghrib_begin"],
                "isha": day_data["isha_begin"],
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day_num),
                "fajr": day_data["fajr_jamah"],
                "dhuhr": dhuhr_j,
                "asr": day_data["asr_jamah"],
                "maghrib": day_data["maghrib_jamah"],
                "isha": day_data["isha_jamah"],
            }
        )
        if dt.weekday() == 4 and jummah is None:
            jummah = day_data.get("jummah_jamah1") or day_data.get("jummah_jamah2") or dhuhr_j

    return {
        "month": MONTH_NAMES[month],
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah or "13:00",
    }


def save_month(slug: str, month: int, payload: dict) -> Path:
    out_dir = DATA_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / MONTH_FILES[month]
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path


def main() -> None:
    targets = dict(TARGETS)
    omar_id = discover_omar_id()
    if omar_id is not None:
        targets[omar_id] = "masjid-omar-huddersfield"

    for mosque_id, slug in sorted(targets.items(), key=lambda x: x[1]):
        print(f"\n=== {slug} (mosqueId={mosque_id}) ===")
        for month in (10, 11):
            rows = fetch_month(mosque_id, month)
            if not rows:
                print(f"  {MONTH_FILES[month]}: no data")
                continue
            payload = build_month_json(rows, month)
            path = save_month(slug, month, payload)
            sample = None
            for iq in payload["iqamah_times"]:
                if iq["date_range"] in {"18", "19"}:
                    sample = iq
                    break
            dhuhr_bugs = [
                p["date"] for p in payload["prayer_times"] if p["dhuhr"].startswith("23:")
            ]
            print(
                f"  wrote {path.name}: {len(payload['prayer_times'])} days"
                f" jummah={payload['jummah_iqamah']}"
                f" sample_iq={sample}"
                f" dhuhr23={dhuhr_bugs or 'none'}"
            )


if __name__ == "__main__":
    main()
