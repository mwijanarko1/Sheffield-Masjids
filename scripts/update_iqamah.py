#!/usr/bin/env python3
"""Replace iqamah_times with user's grouped format for months they've verified."""

import json, os, re

def norm(t):
    """Convert 12h time to HH:MM 24h. t can be string like '6:30', '7:15/7:30', 'Adhan+0'"""
    t = t.strip()
    if "Adhan" in t:
        return t
    if "/" in t:
        parts = t.split("/")
        return "/".join(norm(p) for p in parts)
    if not t or ':' not in t:
        return t
    parts = t.split(":")
    h, m = int(parts[0]), int(parts[1])
    # Is this a PM time? If hour < 12 and not a morning time, add 12
    # Fajr is the only AM iqamah time (usually before 8am)
    # Everything else is PM
    if h < 12:
        h += 12
    return f"{h:02d}:{m:02d}"

# User's grouped iqamah data for January
january_iqamah = [
    {"date_range": "1", "fajr": "07:45", "dhuhr": "12:45", "asr": "14:45", "maghrib": "16:06", "isha": "18:30"},
    {"date_range": "2-8", "fajr": "07:15", "dhuhr": "12:45", "asr": "14:45", "maghrib": "Adhan+0", "isha": "18:30/19:30"},
    {"date_range": "9-15", "fajr": "07:15", "dhuhr": "12:45", "asr": "15:00", "maghrib": "Adhan+0", "isha": "19:30/18:30"},
    {"date_range": "16-22", "fajr": "07:15", "dhuhr": "12:45", "asr": "15:00", "maghrib": "Adhan+0", "isha": "19:30/18:30"},
    {"date_range": "23-29", "fajr": "07:15", "dhuhr": "12:45", "asr": "15:30", "maghrib": "Adhan+0", "isha": "19:30/18:45"},
    {"date_range": "30-31", "fajr": "07:15", "dhuhr": "12:45", "asr": "15:45", "maghrib": "Adhan+0", "isha": "19:30/19:00"},
]

# User's grouped iqamah data for February
february_iqamah = [
    {"date_range": "1-5", "fajr": "07:15", "dhuhr": "12:45", "asr": "15:45", "maghrib": "Adhan+0", "isha": "19:00/19:30"},
    {"date_range": "6-12", "fajr": "07:00", "dhuhr": "12:45", "asr": "15:45", "maghrib": "Adhan+0", "isha": "19:30/19:00"},
    {"date_range": "13-17", "fajr": "06:45", "dhuhr": "12:45", "asr": "16:00", "maghrib": "Adhan+0", "isha": "19:30/19:15"},
    {"date_range": "18-19", "fajr": "06:00", "dhuhr": "12:45", "asr": "16:00", "maghrib": "Adhan+0", "isha": "19:30"},
    {"date_range": "20-23", "fajr": "05:50", "dhuhr": "12:45", "asr": "16:15", "maghrib": "Adhan+0", "isha": "19:45"},
    {"date_range": "24-26", "fajr": "05:40", "dhuhr": "12:45", "asr": "16:15", "maghrib": "Adhan+0", "isha": "19:45"},
    {"date_range": "27-28", "fajr": "05:35", "dhuhr": "12:45", "asr": "16:30", "maghrib": "Adhan+0", "isha": "20:00"},
]

# User's grouped iqamah data for March
march_iqamah = [
    {"date_range": "1-2", "fajr": "05:35", "dhuhr": "12:45", "asr": "16:30", "maghrib": "Adhan+0", "isha": "20:00"},
    {"date_range": "3-5", "fajr": "05:25", "dhuhr": "12:45", "asr": "16:30", "maghrib": "Adhan+0", "isha": "20:00"},
    {"date_range": "6-9", "fajr": "05:15", "dhuhr": "12:45", "asr": "16:45", "maghrib": "Adhan+0", "isha": "20:00"},
    {"date_range": "10-12", "fajr": "05:10", "dhuhr": "12:45", "asr": "16:45", "maghrib": "Adhan+0", "isha": "20:00"},
    {"date_range": "13-16", "fajr": "05:00", "dhuhr": "12:45", "asr": "17:00", "maghrib": "Adhan+0", "isha": "20:15"},
    {"date_range": "17-19", "fajr": "04:55", "dhuhr": "12:45", "asr": "17:00", "maghrib": "Adhan+0", "isha": "20:15"},
    {"date_range": "20-26", "fajr": "05:30", "dhuhr": "12:45", "asr": "17:15", "maghrib": "Adhan+0", "isha": "20:30"},
    {"date_range": "27-28", "fajr": "05:15", "dhuhr": "12:45", "asr": "17:30", "maghrib": "Adhan+0", "isha": "20:30"},
    {"date_range": "29-31", "fajr": "06:15", "dhuhr": "13:45", "asr": "18:30", "maghrib": "Adhan+0", "isha": "21:30"},
]

# Jummah times per user
jummah_map = {
    "JANUARY": "Not stated",
    "FEBRUARY": "Not stated",
    "MARCH": "Not stated",
}

base_dir = "/Users/mikhail/Documents/CURSOR CODES/Deployed/Sheffield-Masjids/public/data/mosques/gb/bolton/taiyabah-masjid"

# Update January
for month, iqamah_data, jummah in [
    ("JANUARY", january_iqamah, "Not stated"),
    ("FEBRUARY", february_iqamah, "Not stated"),  
    ("MARCH", march_iqamah, "Not stated"),
]:
    path = os.path.join(base_dir, f"{month.lower()}.json")
    with open(path) as f:
        data = json.load(f)
    
    data["iqamah_times"] = iqamah_data
    data["jummah_iqamah"] = jummah
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✓ Updated {month.lower()}.json ({len(iqamah_data)} iqamah groups, jummah={jummah})")

print("\nDone! Remaining months (Apr-Dec) still use individual daily iqamah entries from PDF.")
