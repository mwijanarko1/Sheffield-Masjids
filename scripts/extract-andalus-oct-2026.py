#!/usr/bin/env python3
"""
Extract Andalus Community Centre October 2026 prayer times from the timetable.
Based on the official PDF timetable showing all prayer times for the month.
"""

import json
import os

# October 2026 prayer times from the timetable
# Format: date, fajr_begin, fajr_iqamah, sunrise, dhuhr_begin, dhuhr_iqamah, asr_begin, asr_iqamah, maghrib_begin, maghrib_iqamah, isha_begin, isha_iqamah
prayer_data = [
    (1, "05:36", "06:15", "07:06", "12:55", "13:30", "15:59", "16:15", "18:45", "18:50", "20:05", "20:30"),
    (2, "05:37", "06:15", "07:06", "12:55", "13:30", "15:57", "16:15", "18:43", "18:48", "20:14", "20:30"),
    (3, "05:38", "06:15", "07:08", "12:55", "13:30", "15:55", "16:15", "18:41", "18:46", "20:13", "20:30"),
    (4, "05:39", "06:15", "07:10", "12:55", "13:30", "15:53", "16:15", "18:38", "18:43", "20:11", "20:30"),
    (5, "05:40", "06:15", "07:12", "12:54", "13:30", "15:52", "16:15", "18:36", "18:41", "20:09", "20:30"),
    (6, "05:41", "06:15", "07:14", "12:54", "13:30", "15:50", "16:15", "18:34", "18:39", "20:06", "20:30"),
    (7, "05:42", "06:15", "07:15", "12:54", "13:30", "15:48", "16:15", "18:31", "18:36", "20:04", "20:30"),
    (8, "05:44", "06:15", "07:17", "12:53", "13:30", "15:46", "16:15", "18:29", "18:34", "20:01", "20:30"),
    (9, "05:46", "06:15", "07:19", "12:53", "13:30", "15:44", "16:15", "18:26", "18:31", "19:59", "20:30"),
    (10, "05:47", "06:15", "07:21", "12:53", "13:30", "15:43", "16:15", "18:24", "18:29", "19:58", "20:30"),
    (11, "05:48", "06:30", "07:23", "12:53", "13:30", "15:41", "16:00", "18:22", "18:27", "19:57", "20:15"),
    (12, "05:49", "06:30", "07:24", "12:52", "13:30", "15:39", "16:00", "18:19", "18:24", "19:56", "20:15"),
    (13, "05:50", "06:30", "07:26", "12:52", "13:30", "15:37", "16:00", "18:17", "18:22", "19:55", "20:15"),
    (14, "05:51", "06:30", "07:28", "12:52", "13:30", "15:36", "16:00", "18:15", "18:20", "19:54", "20:15"),
    (15, "05:52", "06:30", "07:30", "12:52", "13:30", "15:34", "16:00", "18:13", "18:18", "19:52", "20:15"),
    (16, "05:53", "06:30", "07:32", "12:51", "13:30", "15:32", "16:00", "18:10", "18:15", "19:50", "20:15"),
    (17, "05:54", "06:30", "07:34", "12:51", "13:30", "15:30", "16:00", "18:08", "18:13", "19:48", "20:15"),
    (18, "05:55", "06:30", "07:35", "12:51", "13:30", "15:29", "16:00", "18:06", "18:11", "19:46", "20:15"),
    (19, "05:57", "06:30", "07:37", "12:51", "13:30", "15:27", "16:00", "18:04", "18:09", "19:44", "20:15"),
    (20, "05:58", "06:30", "07:39", "12:51", "13:30", "15:25", "16:00", "18:01", "18:06", "19:43", "20:15"),
    (21, "05:59", "06:45", "07:41", "12:51", "13:30", "15:23", "15:45", "17:59", "18:04", "19:42", "20:00"),
    (22, "06:00", "06:45", "07:43", "12:50", "13:30", "15:22", "15:45", "17:57", "18:02", "19:41", "20:00"),
    (23, "06:01", "06:45", "07:45", "12:50", "13:30", "15:20", "15:45", "17:55", "18:00", "19:40", "20:00"),
    (24, "06:02", "06:45", "07:47", "12:50", "13:30", "15:18", "15:45", "17:53", "17:58", "19:39", "20:00"),
    # Clock change on Oct 25 - times shift back 1 hour
    (25, "05:03", "05:45", "06:48", "11:50", "12:30", "14:17", "14:45", "16:51", "16:56", "18:38", "19:00"),
    (26, "05:04", "05:45", "06:50", "11:50", "12:30", "14:15", "14:45", "16:49", "16:54", "18:36", "19:00"),
    (27, "05:05", "05:45", "06:52", "11:50", "12:30", "14:13", "14:45", "16:47", "16:52", "18:34", "19:00"),
    (28, "05:06", "05:45", "06:54", "11:50", "12:30", "14:12", "14:45", "16:45", "16:50", "18:33", "19:00"),
    (29, "05:08", "05:45", "06:56", "11:50", "12:30", "14:10", "14:45", "16:42", "16:47", "18:31", "19:00"),
    (30, "05:09", "05:45", "06:58", "11:50", "12:30", "14:09", "14:45", "16:41", "16:46", "18:30", "19:00"),
    (31, "05:10", "05:45", "07:00", "11:50", "12:30", "14:07", "14:45", "16:39", "16:44", "18:29", "19:00"),
]

# Jumu'ah (Friday prayer) times
# Until Oct 23: 1st 13:30, 2nd 14:30
# From Oct 30: 1st 12:30, 2nd 13:30
# In the JSON we'll store the first congregation time as jummah_iqamah

def build_october_json():
    prayer_times = []
    iqamah_times = []
    
    for day_data in prayer_data:
        date, fajr_b, fajr_i, sunrise, dhuhr_b, dhuhr_i, asr_b, asr_i, maghrib_b, maghrib_i, isha_b, isha_i = day_data
        
        prayer_times.append({
            "date": date,
            "fajr": fajr_b,
            "shurooq": sunrise,
            "dhuhr": dhuhr_b,
            "asr": asr_b,
            "maghrib": maghrib_b,
            "isha": isha_b
        })
        
        iqamah_times.append({
            "date_range": str(date),
            "fajr": fajr_i,
            "dhuhr": dhuhr_i,
            "asr": asr_i,
            "maghrib": maghrib_i,
            "isha": isha_i
        })
    
    # Jumu'ah: Use the time from before the clock change (13:30) as default
    # Note: There are two congregations but the standard format only has one jummah_iqamah field
    # We'll use the first congregation time
    jummah_iqamah = "13:30"  # Represents the primary/first Jumu'ah congregation
    
    output = {
        "month": "OCTOBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah_iqamah
    }
    
    return output

def main():
    # Create output directory
    output_dir = "/workspace/public/data/mosques/gb/sheffield/andalus-community-centre"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate October 2026 data
    october_data = build_october_json()
    
    # Write to file
    output_file = os.path.join(output_dir, "october.json")
    with open(output_file, "w") as f:
        json.dump(october_data, f, indent=2)
    
    print(f"✓ Written {output_file}")
    print(f"  - 31 prayer time entries")
    print(f"  - 31 iqamah time entries")
    print(f"  - Jumu'ah: {october_data['jummah_iqamah']}")
    
    # Show sample entries
    print("\nSample entries:")
    for day in [1, 23, 25, 30, 31]:
        idx = day - 1
        pt = october_data["prayer_times"][idx]
        iq = october_data["iqamah_times"][idx]
        print(f"\nDay {day}:")
        print(f"  Begins:  Fajr {pt['fajr']}, Sunrise {pt['shurooq']}, Dhuhr {pt['dhuhr']}, Asr {pt['asr']}, Maghrib {pt['maghrib']}, Isha {pt['isha']}")
        print(f"  Iqamah:  Fajr {iq['fajr']}, Dhuhr {iq['dhuhr']}, Asr {iq['asr']}, Maghrib {iq['maghrib']}, Isha {iq['isha']}")

if __name__ == "__main__":
    main()
