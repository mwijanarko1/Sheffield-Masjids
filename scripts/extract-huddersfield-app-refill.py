#!/usr/bin/env python3
"""
Refill: Re-fetch incomplete mosques with corrected month ranges.
"""
import json, os, sys, time, requests
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

MONTH_FILES = ["january.json", "february.json", "march.json", "april.json", "may.json", "june.json",
               "july.json", "august.json", "september.json", "october.json", "november.json", "december.json"]
MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
               "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

# CORRECTED availability based on thorough re-scan
MOSQUE_AVAILABILITY = {
    7:  [1,2,3,4,5,6],       # Masjid Riza: Jan-Jun
    9:  [1,2,3,4,5,6],       # Masjid Noor: Jan-Jun
    10: [1,2,3,4,5,6],       # Eden Centre Lindley: Jan-Jun
    11: [1,2,3,4,5],         # Masjid Ghausia: Jan-May
    12: [2,3,4,5,6],         # Masjid Hanfia: Feb-Jun
    14: [1,2,3,4,5,6],       # Anwar E Madina: Jan-Jun
    15: [1,2,3,4,5,6],       # Eden Centre Highfields: Jan-Jun
    26: [2,3],               # Faizan-e-Madinah: Feb-Mar
    27: [2,3,4,5],           # Northfield: Feb-May
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
    return {m["id"]: m for m in unique}

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
    
    print(f"    Saved {total_days} days across {len([m for m in monthly_prayers if m])} months")
    return mosque_slug

def main():
    print("=" * 60)
    print("Refill: Re-fetching incomplete mosques with correct months")
    print("=" * 60)
    
    mosques = get_mosques()
    
    for mid in sorted(MOSQUE_AVAILABILITY.keys()):
        if mid not in mosques:
            print(f"\n[{mid}] Not found in API, skipping")
            continue
        
        mosque = mosques[mid]
        mosque_slug = generate_mosque_id(mosque)
        city_slug = AREA_CITIES.get(mosque["area_id"], "unknown")
        avail = MOSQUE_AVAILABILITY[mid]
        
        print(f"\n[{mid:2d}] {mosque['name']:35s} -> months {avail}")
        
        all_days = {}
        for month_num in avail:
            month_idx = month_num - 1
            print(f"    Fetching {MONTH_NAMES[month_idx]}...", end=" ", flush=True)
            days = fetch_mosque_month(mid, month_idx)
            print(f"{len(days)} days", flush=True)
            all_days.update(days)
        
        if all_days:
            save_mosque_data(mosque, all_days)
            print(f"    ✓ ({len(all_days)} total days)")
        else:
            print(f"    ✗ No data")
    
    print(f"\n{'=' * 60}")
    print("Done!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
