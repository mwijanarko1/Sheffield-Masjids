#!/usr/bin/env python3
"""
Part 2: Continue fetching remaining mosques from the Huddersfield Prayer app API.
Skips mosques that already have complete data.
"""
import json
import os
import sys
import time
import requests
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from pathlib import Path

API_BASE = "https://ptp.nicsol.co.uk/public/api/v1"
API_TOKEN = "959953737ae1f5b1240d4776aa13ba17f358140a479a07f17a8114fa49cab186"
YEAR = 2026
HEADERS = {
    "Accept": "application/json",
    "Authorization": f"Bearer {API_TOKEN}",
}

PROJECT_DIR = Path("/Users/mikhail/Documents/CURSOR CODES/Deployed/Sheffield-Masjids")
DATA_DIR = PROJECT_DIR / "public/data/mosques/gb"

AREA_CITIES = {1: "huddersfield", 2: "brighouse", 3: "mirfield", 4: "halifax", 5: "holmfirth", 6: "dewsbury", 7: "batley", 8: "heckmondwike", 9: "cleckheaton"}
AREA_CITY_NAMES = {1: "Huddersfield", 2: "Brighouse", 3: "Mirfield", 4: "Halifax", 5: "Holmfirth", 6: "Dewsbury", 7: "Batley", 8: "Heckmondwike", 9: "Cleckheaton"}

MONTH_FILES = ["january.json", "february.json", "march.json", "april.json", "may.json", "june.json", "july.json", "august.json", "september.json", "october.json", "november.json", "december.json"]
MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]

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

def mosque_has_data(mosque):
    """Check if a mosque already has complete monthly data."""
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    mosque_slug = generate_mosque_id(mosque)
    mdir = DATA_DIR / city_slug / mosque_slug
    if not mdir.exists():
        return False
    # Check that all 12 monthly files exist and have data
    for mf in MONTH_FILES:
        fp = mdir / mf
        if not fp.exists():
            return False
        try:
            with open(fp) as f:
                d = json.load(f)
            if len(d.get("prayer_times", [])) < 28:
                return False
        except:
            return False
    return True

def get_mosques():
    """Fetch all mosques from the API."""
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
        except Exception as e:
            print(f"  Area {area_id}: Error - {e}")
    
    seen_ids = set()
    unique = []
    for m in all_mosques:
        if m["id"] not in seen_ids:
            seen_ids.add(m["id"])
            unique.append(m)
    return unique

def fetch_day(mosque_id, date_str):
    """Fetch prayer times for a single day."""
    try:
        r = requests.get(
            f"{API_BASE}/prayer-times/by-date-mosque?mosqueId={mosque_id}&date={date_str}",
            headers=HEADERS, timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            if "prayer_times" in data and len(data["prayer_times"]) > 0:
                return data["prayer_times"][0]
        return None
    except:
        return None

def fetch_mosque_all_days(mosque):
    """Fetch all days for one mosque with parallel batches and retries."""
    mosque_id = mosque["id"]
    
    d = date(YEAR, 1, 1)
    end = date(YEAR, 12, 31)
    all_dates = []
    while d <= end:
        all_dates.append(d.isoformat())
        d += timedelta(days=1)
    
    results = {}
    batch_size = 15  # Smaller batches
    total = len(all_dates)
    failed_dates = set()
    
    print(f"    Fetching {total} days in batches of {batch_size}...", flush=True)
    
    for i in range(0, total, batch_size):
        batch = all_dates[i:i+batch_size]
        batch_results = {}
        
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = {executor.submit(fetch_day, mosque_id, dt): dt for dt in batch}
            for future in as_completed(futures):
                dt = futures[future]
                try:
                    result = future.result(timeout=20)
                    if result:
                        batch_results[dt] = result
                except:
                    failed_dates.add(dt)
        
        results.update(batch_results)
        
        # Track failures
        for dt in batch:
            if dt not in batch_results:
                failed_dates.add(dt)
        
        # Progress
        pct = min((i + batch_size) / total * 100, 100)
        print(f"      {min(i+batch_size, total)}/{total} ({pct:.0f}%) - got {len(results)} so far", flush=True)
        
        time.sleep(0.2)  # Small delay between batches
    
    # Retry failed dates once
    if failed_dates:
        print(f"    Retrying {len(failed_dates)} failed dates...", flush=True)
        retry_batch = list(failed_dates)
        for i in range(0, len(retry_batch), batch_size):
            batch = retry_batch[i:i+batch_size]
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
            time.sleep(0.3)
    
    print(f"    => Total: {len(results)}/{total} days fetched")
    return results

def save_mosque_data(mosque, all_days):
    """Save mosque data to monthly JSON files."""
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    mosque_id = generate_mosque_id(mosque)
    mosque_dir = DATA_DIR / city_slug / mosque_id
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
        
        # Track Jumu'ah time (use first Friday's value)
        if dt.weekday() == 4:  # Friday
            if month_idx not in jummah_per_month:
                jummah_val = day_data.get("jummah_jamah1") or day_data.get("jummah_jamah2") or day_data.get("dhuhr_jamah", "13:00")
                jummah_per_month[month_idx] = jummah_val
    
    # Write monthly files
    for month_idx in range(12):
        monthly_prayers[month_idx].sort(key=lambda x: x["date"])
        monthly_iqamahs[month_idx].sort(key=lambda x: int(str(x["date_range"])))
        
        month_data = {
            "month": MONTH_NAMES[month_idx],
            "prayer_times": monthly_prayers[month_idx],
            "iqamah_times": monthly_iqamahs[month_idx],
            "jummah_iqamah": jummah_per_month.get(month_idx, "13:00")
        }
        
        with open(mosque_dir / MONTH_FILES[month_idx], "w") as f:
            json.dump(month_data, f, indent=2)
    
    return mosque_id

def ensure_in_mosques_json(mosque, mosque_slug):
    """Add mosque entry if not present."""
    mosques_json_path = PROJECT_DIR / "public/data/mosques.json"
    with open(mosques_json_path, "r") as f:
        data = json.load(f)
    
    mosques_list = data.get("mosques", [])
    
    for pm in mosques_list:
        if pm.get("id") == mosque_slug:
            # Update the api_mosque_id if missing
            if "api_mosque_id" not in pm:
                pm["api_mosque_id"] = mosque["id"]
                with open(mosques_json_path, "w") as f:
                    json.dump(data, f, indent=2)
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
    print("Huddersfield Prayer App - Part 2: Remaining Mosques")
    print("=" * 60)
    
    mosques = get_mosques()
    print(f"Total mosques in API: {len(mosques)}")
    
    # Check which ones already have complete data
    remaining = []
    for m in mosques:
        if mosque_has_data(m):
            print(f"  ✓ {m['name']:35s} - already complete")
        else:
            remaining.append(m)
    
    print(f"\nRemaining to fetch: {len(remaining)}")
    
    for mosque in remaining:
        mosque_slug = generate_mosque_id(mosque)
        city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
        print(f"\n[{mosque['id']:2d}] {mosque['name']:35s} -> {city_slug}/{mosque_slug}")
        
        all_days = fetch_mosque_all_days(mosque)
        
        if len(all_days) >= 300:  # At least 300 out of 365
            print(f"    Saving data...", flush=True)
            final_slug = save_mosque_data(mosque, all_days)
            ensure_in_mosques_json(mosque, final_slug)
            print(f"    ✓ Complete!")
        else:
            print(f"    ✗ Only got {len(all_days)} days, need at least 300. Skipping save.")
    
    print(f"\n{'=' * 60}")
    print("Done!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
