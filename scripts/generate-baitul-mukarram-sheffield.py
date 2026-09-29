#!/usr/bin/env python3
"""
Generate monthly JSON files for Baitul Mukarram Jame Masjid (Sheffield)
from Firestore yearlyTables data.
"""

import json
from datetime import datetime

def convert_12h_to_24h(time_str):
    """Convert 12-hour time string like '5:29 AM' to 24-hour 'HH:MM'."""
    dt = datetime.strptime(time_str, "%I:%M %p")
    return dt.strftime("%H:%M")

# Load the yearlyTables data
with open('/home/ubuntu/.cursor/projects/workspace/uploads/yearlyTables.normalized_4dec.json', 'r') as f:
    data = json.load(f)

# Month name mapping
MONTH_NAMES = {
    "January": "JANUARY",
    "February": "FEBRUARY",
    "March": "MARCH",
    "April": "APRIL",
    "May": "MAY",
    "June": "JUNE",
    "July": "JULY",
    "August": "AUGUST",
    "September": "SEPTEMBER",
    "October": "OCTOBER",
    "November": "NOVEMBER",
    "December": "DECEMBER"
}

# Filename mapping
MONTH_FILES = {
    "January": "january",
    "February": "february",
    "March": "march",
    "April": "april",
    "May": "may",
    "June": "june",
    "July": "july",
    "August": "august",
    "September": "september",
    "October": "october",
    "November": "november",
    "December": "december"
}

# Dual Jummah times from times.json
DUAL_JUMMAH = "13:45 / 14:30"

# Iqamah times for September 29 only (from times.json)
SEPTEMBER_29_IQAMAH = {
    "date_range": "29",
    "fajr": "05:45",
    "dhuhr": "14:00",
    "asr": "17:15",
    "maghrib": "18:58",
    "isha": "20:30"
}

months_data = data["months"]

for month_name, month_data in months_data.items():
    prayer_times = []
    
    for day_data in month_data["days"]:
        day = day_data["day"]
        
        # Convert all times to 24h format
        prayer_times.append({
            "date": day,
            "fajr": convert_12h_to_24h(day_data["Fajr"]),
            "shurooq": convert_12h_to_24h(day_data["Sunrise"]),
            "dhuhr": convert_12h_to_24h(day_data["Zuhr"]),
            "asr": convert_12h_to_24h(day_data["Asr_H"]),
            "maghrib": convert_12h_to_24h(day_data["Maghrib"]),
            "isha": convert_12h_to_24h(day_data["Isha"])
        })
    
    # Iqamah times: only September day 29 has data
    iqamah_times = []
    if month_name == "September":
        iqamah_times = [SEPTEMBER_29_IQAMAH]
    
    # Build the month JSON
    month_json = {
        "month": MONTH_NAMES[month_name],
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": DUAL_JUMMAH
    }
    
    # Write to file
    filename = MONTH_FILES[month_name]
    output_path = f"/workspace/public/data/mosques/gb/sheffield/baitul-mukarram-sheffield/{filename}.json"
    
    with open(output_path, 'w') as f:
        json.dump(month_json, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {filename}.json with {len(prayer_times)} days")

print("\nAll 12 month files generated successfully!")
