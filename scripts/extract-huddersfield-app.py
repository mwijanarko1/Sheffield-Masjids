#!/usr/bin/env python3
"""
Extract ALL prayer times from the Huddersfield Prayer app API for 2026.
Converts data to the Sheffield-Masjids project format.
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
HEADERS = {
    "Accept": "application/json",
    "Authorization": f"Bearer {API_TOKEN}",
}

# Project base path
PROJECT_DIR = Path("/Users/mikhail/Documents/CURSOR CODES/Deployed/Sheffield-Masjids")
DATA_DIR = PROJECT_DIR / "public/data/mosques/gb"

# Area to city mapping
AREA_CITIES = {
    1: "huddersfield",
    2: "brighouse",
    3: "mirfield",
    4: "halifax",
    5: "holmfirth",
    6: "dewsbury",
    7: "batley",
    8: "heckmondwike",
    9: "cleckheaton",
}

AREA_CITY_NAMES = {
    1: "Huddersfield",
    2: "Brighouse",
    3: "Mirfield",
    4: "Halifax",
    5: "Holmfirth",
    6: "Dewsbury",
    7: "Batley",
    8: "Heckmondwike",
    9: "Cleckheaton",
}

# We already have Masjid Omar registered, so skip it
EXISTING_MOSQUE_IDS = {}  # Will be populated from mosques.json

def get_mosques_from_api():
    """Fetch all mosques from the API across all areas."""
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
                    print(f"  Area {area_id} ({AREA_CITY_NAMES[area_id]}): {len(data['mosques'])} mosques")
            else:
                print(f"  Area {area_id}: HTTP {r.status_code}")
        except Exception as e:
            print(f"  Area {area_id}: Error - {e}")
    
    # Remove duplicates (same mosque might appear in multiple areas via nearby queries)
    seen_ids = set()
    unique_mosques = []
    for m in all_mosques:
        if m["id"] not in seen_ids:
            seen_ids.add(m["id"])
            unique_mosques.append(m)
    
    return unique_mosques


def fetch_day_prayer_times(mosque_id, date_str):
    """Fetch prayer times for a specific mosque and date."""
    try:
        r = requests.get(
            f"{API_BASE}/prayer-times/by-date-mosque?mosqueId={mosque_id}&date={date_str}",
            headers=HEADERS,
            timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            if "prayer_times" in data and len(data["prayer_times"]) > 0:
                return data["prayer_times"][0]
        return None
    except Exception:
        return None


def slugify(name):
    """Convert a name to a URL-friendly slug."""
    s = name.lower().strip()
    s = s.replace(" ", "-").replace("'", "").replace("/", "-")
    s = s.replace("&", "and")
    import re
    s = re.sub(r'[^a-z0-9-]', '', s)
    s = re.sub(r'-+', '-', s)
    return s.strip("-")


def generate_mosque_id(mosque):
    """Generate a unique mosque ID (slug)."""
    base = slugify(mosque["name"])
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    # Some mosques already have city in name, check
    if city_slug not in base:
        return f"{base}-{city_slug}"
    return base


def generate_mask(mosque_db_id, project_mosques):
    """Check if mosque already exists in project."""
    for pm in project_mosques:
        if pm.get("api_mosque_id") == mosque_db_id:
            return pm
    return None


def pt_to_project_format(day_data, mosque, jummah_times):
    """Convert API prayer time data to project monthly format entry."""
    date_str = day_data["date"][:10]  # "2026-01-01"
    day_num = int(date_str.split("-")[2])
    
    entry = {
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
    
    return entry, iqamah_entry


MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
]

MONTH_FILES = [
    "january.json", "february.json", "march.json", "april.json",
    "may.json", "june.json", "july.json", "august.json",
    "september.json", "october.json", "november.json", "december.json"
]

MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
# 2026 is not a leap year (2026 % 4 != 0)

def fetch_all_prayer_times(mosque):
    """Fetch all 365 days of prayer times for a mosque."""
    mosque_id = mosque["id"]
    all_days = {}
    
    # Generate all dates
    d = date(YEAR, 1, 1)
    end = date(YEAR, 12, 31)
    dates = []
    while d <= end:
        dates.append(d.isoformat())
        d += timedelta(days=1)
    
    print(f"    Fetching {len(dates)} days...", end=" ", flush=True)
    
    # Use ThreadPoolExecutor for parallel requests
    batch_size = 20
    total_fetched = 0
    
    for i in range(0, len(dates), batch_size):
        batch = dates[i:i+batch_size]
        results = {}
        
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = {executor.submit(fetch_day_prayer_times, mosque_id, dt): dt for dt in batch}
            for future in as_completed(futures):
                dt = futures[future]
                try:
                    result = future.result()
                    if result:
                        results[dt] = result
                        total_fetched += 1
                except Exception:
                    pass
        
        all_days.update(results)
        
        # Progress indicator
        if (i + batch_size) % 200 == 0:
            print(f"{total_fetched}/{len(dates)}", end=" ", flush=True)
        
        # Small delay to not hammer the API
        time.sleep(0.1)
    
    print(f"✓ ({total_fetched} days fetched)")
    return all_days


def save_mosque_data(mosque, all_days):
    """Save mosque prayer times into monthly JSON files."""
    city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
    mosque_id = generate_mosque_id(mosque)
    
    mosque_dir = DATA_DIR / city_slug / mosque_id
    mosque_dir.mkdir(parents=True, exist_ok=True)
    
    # Organize by month
    monthly_prayers = {m: [] for m in range(12)}
    monthly_iqamahs = {m: [] for m in range(12)}
    jummah_times = {}
    
    for date_str, day_data in sorted(all_days.items()):
        dt = date.fromisoformat(date_str)
        month_idx = dt.month - 1
        
        prayer_entry, iqamah_entry = pt_to_project_format(day_data, mosque, jummah_times)
        
        monthly_prayers[month_idx].append(prayer_entry)
        monthly_iqamahs[month_idx].append(iqamah_entry)
        
        # Track Jumu'ah times - check Friday-specific fields
        if day_data.get("jummah_jamah1"):
            jummah_times[date_str] = day_data["jummah_jamah1"]
    
    # Also check if there's a consistent jummah time
    # From the data, we need one jummah_iqamah per month
    # Let's look for Friday dhuhr jama'ah times
    
    jummah_per_month = {}
    for date_str, day_data in sorted(all_days.items()):
        dt = date.fromisoformat(date_str)
        month_idx = dt.month - 1
        weekday = dt.weekday()  # Monday=0, Sunday=6, Friday=4
        day_of_month = dt.day
        
        if weekday == 4:  # Friday
            if day_data.get("jummah_jamah1"):
                jummah_per_month[month_idx] = day_data["jummah_jamah1"]
                break
            elif day_data.get("jummah_jamah2"):
                jummah_per_month[month_idx] = day_data["jummah_jamah2"]
                break
    
    # Write monthly files
    for month_idx in range(12):
        filename = MONTH_FILES[month_idx]
        filepath = mosque_dir / filename
        
        # Sort by date
        monthly_prayers[month_idx].sort(key=lambda x: x["date"])
        monthly_iqamahs[month_idx].sort(key=lambda x: int(str(x["date_range"])))
        
        month_data = {
            "month": MONTH_NAMES[month_idx],
            "prayer_times": monthly_prayers[month_idx],
            "iqamah_times": monthly_iqamahs[month_idx],
            "jummah_iqamah": jummah_per_month.get(month_idx, "13:00")
        }
        
        with open(filepath, "w") as f:
            json.dump(month_data, f, indent=2)
        
        print(f"    Saved {filename} ({len(monthly_prayers[month_idx])} days)")
    
    return mosque_id


def ensure_in_mosques_json(mosque, mosque_slug):
    """Add mosque to mosques.json if not already present."""
    mosques_json_path = PROJECT_DIR / "public/data/mosques.json"
    
    with open(mosques_json_path, "r") as f:
        data = json.load(f)
    
    mosques_list = data.get("mosques", [])
    
    # Check if already exists
    for pm in mosques_list:
        if pm.get("id") == mosque_slug:
            print(f"    Already in mosques.json: {mosque_slug}")
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
    
    with open(mosques_json_path, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"    Added to mosques.json: {mosque_slug}")
    return new_entry


def main():
    print("=" * 60)
    print("Huddersfield Prayer App - Full Data Extraction")
    print("=" * 60)
    
    # Step 1: Get all mosques from API
    print("\n[1] Fetching all mosques from API...")
    mosques = get_mosques_from_api()
    print(f"  Total unique mosques: {len(mosques)}")
    
    # Step 2: Load existing mosques.json
    mosques_json_path = PROJECT_DIR / "public/data/mosques.json"
    with open(mosques_json_path, "r") as f:
        existing_data = json.load(f)
    
    existing_mosques = {pm["id"] for pm in existing_data.get("mosques", [])}
    
    # Step 3: Process each mosque
    total_new = 0
    total_skipped = 0
    
    for mosque in sorted(mosques, key=lambda m: (m["area_id"], m["id"])):
        mosque_slug = generate_mosque_id(mosque)
        city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
        
        print(f"\n[{mosque['id']:2d}] {mosque['name']:35s} -> {city_slug}/{mosque_slug}")
        
        # Check if this mosque already has data
        mosque_dir = DATA_DIR / city_slug / mosque_slug
        has_data = mosque_dir.exists() and any(mosque_dir.iterdir())
        
        if has_data:
            print(f"    ⚠ Already has data directory, skipping fetch")
            total_skipped += 1
        else:
            # Fetch all prayer times
            all_days = fetch_all_prayer_times(mosque)
            
            if len(all_days) > 0:
                # Save monthly files
                print(f"    Saving data files...")
                final_slug = save_mosque_data(mosque, all_days)
                
                # Add to mosques.json
                if mosque_slug not in existing_mosques:
                    ensure_in_mosques_json(mosque, mosque_slug)
                else:
                    print(f"    Already in mosques.json")
                
                total_new += 1
            else:
                print(f"    ✗ No prayer times data returned!")
    
    print(f"\n{'=' * 60}")
    print(f"Done! Processed {total_new + total_skipped} mosques")
    print(f"  New: {total_new}")
    print(f"  Skipped (already had data): {total_skipped}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
