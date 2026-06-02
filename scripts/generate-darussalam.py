#!/usr/bin/env python3
"""Generate prayer times JSON files for Darussalam Masjid & Cultural Centre."""
import urllib.request
import re
import json
import os

MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
               "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
MONTH_FILES = ["january", "february", "march", "april", "may", "june",
               "july", "august", "september", "october", "november", "december"]

def fetch_html(month, year=2026):
    url = f"https://www.darussalamcentre.org/prayer-times?month={month}&year={year}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')

def resolve_lazy_refs(content, lazy_defs):
    result = content
    refs = re.findall(r'\$L([a-f0-9]+)', result)
    for ref in refs:
        if ref in lazy_defs:
            replacement = resolve_lazy_refs(lazy_defs[ref], lazy_defs)
            result = result.replace(f'$L{ref}', replacement)
    return result

def extract_data(html, month_num):
    pushes = re.findall(r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)', html)
    
    lazy_defs = {}
    for p in pushes:
        s = p.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        col_pos = s.find(':')
        if col_pos > 0 and col_pos < 10:
            key = s[:col_pos]
            content = s[col_pos + 1:]
            lazy_defs[key] = content
    
    for p in pushes:
        s = p.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        col_pos = s.find(':')
        content = s[col_pos + 1:] if col_pos > 0 and col_pos < 10 else s
        
        if '"$","tbody"' not in content:
            continue
        
        resolved = resolve_lazy_refs(content, lazy_defs)
        
        tbody_start = resolved.find('"$","tbody"')
        if tbody_start == -1:
            continue
        tbody_section = resolved[tbody_start:]
        
        all_string_values = re.findall(r'"children":"([^"]+)"', tbody_section)
        all_dates = re.findall(r'\$","span",null,\{"children":(\d+)\}', tbody_section)
        
        valid_values = {'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', '—'}
        time_pattern = re.compile(r'^\d{2}:\d{2}$')
        data_values = [v for v in all_string_values if v in valid_values or time_pattern.match(v)]
        
        day_names_set = {'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'}
        
        rows = []
        for i in range(0, len(data_values), 12):
            if i + 12 > len(data_values):
                break
            row_vals = data_values[i:i+12]
            day_name = row_vals[0]
            if day_name not in day_names_set:
                continue
            
            date_num = int(all_dates[len(rows)]) if len(rows) < len(all_dates) else None
            if date_num is None:
                continue
            
            times = row_vals[1:]
            # For iqamah fields (positions 1, 4, 6, 8, 10), if dash, use adhan time
            adhan_positions = {'fajr': 0, 'dhuhr': 3, 'asr': 5, 'maghrib': 7, 'isha': 9}
            iqamah_indices = [1, 4, 6, 8, 10]  # positions of iqamah in times list
            for idx in iqamah_indices:
                if idx < len(times) and times[idx] == '—':
                    # Find corresponding adhan time
                    adhan_idx = {'fajr': 0, 'dhuhr': 3, 'asr': 5, 'maghrib': 7, 'isha': 9}
                    for prayer, a_idx in adhan_idx.items():
                        # iqamah at idx corresponds to adhan at a_idx
                        pass
                    # Simple: match by position
                    adhan_pos = idx - 1  # adhan is immediately before iqamah in correct cases
                    # But actually fajr_iqamah is at idx=1, fajr adhan at idx=0 ✓
                    # dhuhr_iqamah at idx=4, dhuhr adhan at idx=3 ✓
                    # asr_iqamah at idx=6, asr adhan at idx=5 ✓
                    # maghrib_iqamah at idx=8, maghrib adhan at idx=7 ✓
                    # isha_iqamah at idx=10, isha adhan at idx=9 ✓
                    if idx - 1 >= 0 and idx - 1 < len(times) and times[idx-1] not in ('', '—'):
                        times[idx] = times[idx-1]  # Use adhan time for iqamah
            while len(times) < 11:
                times.append('')
            
            entry = {"date": date_num, "day": day_name}
            if len(times) >= 1: entry["fajr"] = times[0]
            if len(times) >= 2: entry["fajr_iqamah"] = times[1]
            if len(times) >= 3: entry["shurooq"] = times[2]
            if len(times) >= 4: entry["dhuhr"] = times[3]
            if len(times) >= 5: entry["dhuhr_iqamah"] = times[4]
            if len(times) >= 6: entry["asr"] = times[5]
            if len(times) >= 7: entry["asr_iqamah"] = times[6]
            if len(times) >= 8: entry["maghrib"] = times[7]
            if len(times) >= 9: entry["maghrib_iqamah"] = times[8]
            if len(times) >= 10: entry["isha"] = times[9]
            if len(times) >= 11: entry["isha_iqamah"] = times[10]
            
            rows.append(entry)
        
        rows.sort(key=lambda x: x["date"])
        return rows
    
    return []

def format_month_json(month_num, entries):
    month_name = MONTH_NAMES[month_num - 1]
    
    prayer_times = []
    iqamah_times = []
    
    for e in entries:
        prayer_times.append({
            "date": e["date"],
            "fajr": e.get("fajr", ""),
            "shurooq": e.get("shurooq", ""),
            "dhuhr": e.get("dhuhr", ""),
            "asr": e.get("asr", ""),
            "maghrib": e.get("maghrib", ""),
            "isha": e.get("isha", "")
        })
        
        iqamah_times.append({
            "date_range": str(e["date"]),
            "fajr": e.get("fajr_iqamah", ""),
            "dhuhr": e.get("dhuhr_iqamah", ""),
            "asr": e.get("asr_iqamah", ""),
            "maghrib": e.get("maghrib_iqamah", ""),
            "isha": e.get("isha_iqamah", "")
        })
    
    jummah_iqamah = ""
    for e in entries:
        if e.get("day") == "Fri" and e.get("dhuhr_iqamah", ""):
            jummah_iqamah = e["dhuhr_iqamah"]
            break
    
    return {
        "month": month_name,
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah_iqamah
    }

def main():
    basedir = "public/data/mosques/gb/london/darussalam-masjid"
    os.makedirs(basedir, exist_ok=True)
    
    for month_num in range(1, 13):
        print(f"Fetching month {month_num} ({MONTH_NAMES[month_num-1]})...")
        html = fetch_html(month_num)
        entries = extract_data(html, month_num)
        
        if not entries:
            print(f"  ERROR: No data extracted!")
            continue
        
        data = format_month_json(month_num, entries)
        
        filename = f"{basedir}/{MONTH_FILES[month_num-1]}.json"
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  Written {len(entries)} days to {filename}")
    
    print("\nDone! All 12 files created.")

if __name__ == "__main__":
    main()
