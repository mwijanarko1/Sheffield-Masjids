#!/usr/bin/env python3
"""
Part 3: Targeted extraction - only fetch months that have data.
Much faster since we skip empty months entirely.
"""
import json
import os
import sys
import time
import requests
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API_BASE = "https://ptp.nicsol.co.uk/public/api/v1"
API_TOKEN = "959953737ae1f5b1240d4776aa13ba17f358140a479a07f17a8114fa49cab186"
YEAR = 2026
HEADERS = {"Accept": "application/json", "Authorization": f"Bearer {API_TOKEN}"}

PROJECT_DIR = Path("/Users/mikhail/Documents/CURSOR CODES/Deployed/Sheffield-Masjids")
DATA_DIR = PROJECT_DIR / "public/data/mosques/gb"

AREA_CITIES = {1: "huddersfield", 2: "brighouse", 3: "mirfield", 4: "halifax", 5: "holmfirth", 6: "dewsbury", 7: "batley", 8: "heckmondwike", 9: "cleckheaton"}
AREA_CITY_NAMES = {1: "Huddersfield", 2: "Brighouse", 3: "Mirfield", 4: "Halifax", 5: "Holmfirth", 6: "Dewsbury", 7: "Batley", 8: "Heckmondwike", 9: "Cleckheaton"}

MONTH_FILES = ["january.json", "february.json", "march.json", "april.json", "may.json", "june.json", "july.json", "august.json", "september.json", "october.json", "november.json", "december.json"]
MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

# Known data availability per mosque ID
# mosque_id -> list of month indices (1-based)
MOSQUE_AVAILABILITY = {
    1: list(range(1,13)), 2: list(range(2,13)), 3: list(range(2,13)),
    4: list(range(2,13)), 5: list(range(2,13)), 6: list(range(1,13)),
    7: [2,3,4], 9: [1,2,3,4], 10: [1,2,3,4,5,6],
    11: [3,4], 12: [3,4,6], 13: list(range(2,13)),
    14: [1,2,3,4,6], 15: [1,2,3,4,6], 16: list(range(2,13)),
    26: [3], 27: [3,4],
}

def slugify(name):
    s = name.lower().strip().replace(" ", "-").replace("'", "").replace("/", "-").replace("&", "and")
    import re
    s = re.sub(r'[^a-z0-9-]', '', s)
    s = re.sub(r'-+', '-', s)
    return s.strip("-")

def generate_mosque_id(mosque):
    base = slugify(mosque["name"])
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    if city_slug not in base:
        return f"{base}-{city_slug}"
    return base

def get_mosques():
    all_mosques = []
    for area_id in AREA_CITIES:
        try:
            r = requests.get(f"{API_BASE}/prayer-times/mosques/{area_id}", headers=HEADERS, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if "mosques" in data:
                    for m in data["mosques"]:
                        m["area_id"] = area_id
                        all_mosques.append(m)
        except:
            pass
    seen = set()
    unique = []
    for m in all_mosques:
        if m["id"] not in seen:
            seen.add(m["id"])
            unique.append(m)
    return unique

def fetch_day(mosque_id, date_str):
    try:
        r = requests.get(f"{API_BASE}/prayer-times/by-date-mosque?mosqueId={mosque_id}&date={date_str}", headers=HEADERS, timeout=15)
        if r.status_code == 200:
            data = r.json()
            if "prayer_times" in data and len(data["prayer_times"]) > 0:
                return data["prayer_times"][0]
        return None
    except:
        return None

def fetch_mosque_month(mosque_id, month_idx):
    """Fetch all days in a given month for a mosque."""
    month_days = MONTH_DAYS[month_idx]
    dates = [f"{YEAR}-{month_idx+1:02d}-{d:02d}" for d in range(1, month_days+1)]
    
    results = {}
    batch_size = 20
    
    for i in range(0, len(dates), batch_size):
        batch = dates[i:i+batch_size]
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = {executor.submit(fetch_day, mosque_id, dt): dt for dt in batch}
            for future in as_completed(futures):
                dt = futures[future]
                try:
                    result = future.result(timeout=20)
                    if result:
                        results[dt] = result
                except:
                    pass
        time.sleep(0.1)
    
    return results

def save_mosque_data(mosque, all_days):
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    mosque_slug = generate_mosque_id(mosque)
    mosque_dir = DATA_DIR / city_slug / mosque_slug
    mosque_dir.mkdir(parents=True, exist_ok=True)
    
    monthly_prayers = {m: [] for m in range(12)}
    monthly_iqamahs = {m: [] for m in range(12)}
    jummah_per_month = {}
    
    for date_str, day_data in sorted(all_days.items()):
        dt = date.fromisoformat(date_str)
        month_idx = dt.month - 1
        day_num = dt.day
        
        prayer_entry = {
            "date": day_num,
            "fajr": day_data["fajr_begin"],
            "shurooq": day_data["sunrise"],
            "dhuhr": day_data["dhuhr_begin"],
            "asr": day_data["asr_begin"],
            "maghrib": day_data["maghrib_begin"],
            "isha": day_data["isha_begin"],
        }
        iqamah_entry = {
            "date_range": str(day_num),
            "fajr": day_data["fajr_jamah"],
            "dhuhr": day_data["dhuhr_jamah"],
            "asr": day_data["asr_jamah"],
            "maghrib": day_data["maghrib_jamah"],
            "isha": day_data["isha_jamah"],
        }
        monthly_prayers[month_idx].append(prayer_entry)
        monthly_iqamahs[month_idx].append(iqamah_entry)
        
        if dt.weekday() == 4:
            if month_idx not in jummah_per_month:
                jummah_val = day_data.get("jummah_jamah1") or day_data.get("jummah_jamah2") or day_data.get("dhuhr_jamah", "13:00")
                jummah_per_month[month_idx] = jummah_val
    
    total_days = 0
    for month_idx in range(12):
        monthly_prayers[month_idx].sort(key=lambda x: x["date"])
        monthly_iqamahs[month_idx].sort(key=lambda x: int(str(x["date_range"])))
        
        month_data = {
            "month": MONTH_NAMES[month_idx],
            "prayer_times": monthly_prayers[month_idx],
            "iqamah_times": monthly_iqamahs[month_idx],
            "jummah_iqamah": jummah_per_month.get(month_idx, "13:00")
        }
        
        if monthly_prayers[month_idx]:
            total_days += len(monthly_prayers[month_idx])
        
        with open(mosque_dir / MONTH_FILES[month_idx], "w") as f:
            json.dump(month_data, f, indent=2)
    
    return mosque_slug, total_days

def ensure_in_mosques_json(mosque, mosque_slug):
    mosques_json_path = PROJECT_DIR / "public/data/mosques.json"
    with open(mosques_json_path, "r") as f:
        data = json.load(f)
    
    mosques_list = data.get("mosques", [])
    for pm in mosques_list:
        if pm.get("id") == mosque_slug:
            return pm
    
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    city_name = AREA_CITY_NAMES.get(mosque["area_id"], "Unknown")
    address_parts = [mosque.get("address1", ""), mosque.get("address2", ""), mosque.get("city", ""), mosque.get("postcode", "")]
    address = ", ".join(p for p in address_parts if p)
    
    new_entry = {
        "id": mosque_slug,
        "name": mosque["name"],
        "address": address,
        "lat": mosque["latitude"],
        "lng": mosque["longitude"],
        "slug": mosque_slug,
        "citySlug": city_slug,
        "cityName": city_name,
        "countryCode": "GB",
        "countryName": "United Kingdom",
        "isHidden": False,
        "website": "",
        "api_mosque_id": mosque["id"],
    }
    
    mosques_list.append(new_entry)
    data["mosques"] = mosques_list
    with open(mosques_json_path, "w") as f:
        json.dump(data, f, indent=2)
    return new_entry

def main():
    print("=" * 60)
    print("Huddersfield Prayer App - Part 3: Targeted Month Fetch")
    print("=" * 60)
    
    mosques = get_mosques()
    mosques_by_id = {m["id"]: m for m in mosques}
    
    # Already saved mosques (IDs 1-6, 13, 16)
    already_done = {1, 2, 3, 4, 5, 6, 13, 16}
    
    # Skip Masjid Omar (8) - already in project
    skip_ids = {8}
    
    # Mosques with NO data at all: 17, 18, 19, 20, 21, 22, 23, 24, 25
    no_data_ids = {17, 18, 19, 20, 21, 22, 23, 24, 25}
    
    # Remaining mosques to fetch
    remaining = [m for m in mosques if m["id"] not in already_done and m["id"] not in skip_ids and m["id"] in MOSQUE_AVAILABILITY]
    
    print(f"\nMosques to fetch: {len(remaining)}")
    
    for mosque in sorted(remaining, key=lambda m: m["id"]):
        mid = mosque["id"]
        mosque_slug = generate_mosque_id(mosque)
        city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
        
        avail_months = MOSQUE_AVAILABILITY.get(mid, [])
        print(f"\n[{mid:2d}] {mosque['name']:35s} -> {city_slug}/{mosque_slug}")
        print(f"    Available months: {avail_months}")
        
        all_days = {}
        for month_num in avail_months:
            month_idx = month_num - 1
            print(f"    Fetching {MONTH_NAMES[month_idx]}...", end=" ", flush=True)
            days = fetch_mosque_month(mid, month_idx)
            print(f"{len(days)} days", flush=True)
            all_days.update(days)
        
        if all_days:
            print(f"    Total: {len(all_days)} days - Saving...", flush=True)
            slug, total = save_mosque_data(mosque, all_days)
            ensure_in_mosques_json(mosque, slug)
            print(f"    ✓ Saved {total} days across {len(avail_months)} months")
        else:
            print(f"    ✗ No data fetched")
    
    # Report mosques with no data available
    print(f"\n{'=' * 60}")
    print("Mosques with NO prayer times data in API:")
    for mid in sorted(no_data_ids):
        if mid in mosques_by_id:
            print(f"  [{mid:2d}] {mosques_by_id[mid]['name']}")
    
    print(f"\n{'=' * 60}")
    print("Done!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
