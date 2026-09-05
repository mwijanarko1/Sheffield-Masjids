#!/usr/bin/env python3
"""Parse Taiyabah Masjid 2026 timetable PDF into monthly JSON files."""

import json, re, os

with open("/tmp/taiyabah-timetable.txt") as f:
    lines = f.readlines()

month_starts = {
    "JANUARY": 66, "FEBRUARY": 117, "MARCH": 167, "APRIL": 219,
    "MAY": 271, "JUNE": 321, "JULY": 372, "AUGUST": 424,
    "SEPTEMBER": 475, "OCTOBER": 527, "NOVEMBER": 579, "DECEMBER": 631
}

def norm(t, is_pm_context=False):
    """Normalize time to HH:MM 24h format.
    is_pm_context: True for Zuhr/Asr/Maghrib/Isha which are PM times."""
    t = t.strip()
    if not t or ':' not in t:
        return t
    parts = t.split(":")
    h = int(parts[0])
    m = int(parts[1])
    if is_pm_context:
        if h < 12:
            h += 12
    return f"{h:02d}:{m:02d}"

def resolve_ditto(val, prev):
    """Resolve ditto mark - return previous value if val is a ditto"""
    v = val.strip()
    if not v or v in ('"', '“', '”', "'", '"', '"', ' "', '"', '”'):
        return prev if prev else val
    return v

def parse_month_table(month_name):
    """Parse a month's data lines from the PDF text."""
    start = month_starts[month_name]
    month_list = list(month_starts.keys())
    idx = month_list.index(month_name)
    if idx < len(month_list) - 1:
        end = month_starts[month_list[idx + 1]]
    else:
        end = len(lines)
    
    section = lines[start:end]
    data_lines = []
    in_table = False
    
    for line in section:
        s = line.strip()
        if not s:
            continue
        if "HIJRI DATE" in s:
            in_table = True
            continue
        if in_table:
            if s.startswith("IT IS FORBIDDEN"):
                break
            if s.startswith("•"):
                break
            # Data lines start with a number
            if re.match(r'^\*?\d{1,2}\b', s) and not re.match(r'^\*?\d+(ST|ND|RD|TH)', s, re.I):
                s_clean = re.sub(r'^\*?(\d+)\*?', r'\1', s)
                data_lines.append(s_clean)
    
    return data_lines

def split_tokens(line):
    """Split a data line into tokens by 2+ spaces."""
    return re.split(r'  +', line.strip())

def get_time_tokens(tokens):
    """Get tokens that look like times (contain :) or are ditto marks."""
    result = []
    for t in tokens:
        tt = t.strip()
        if ':' in tt or tt in ('"', '“', '”', "'", ' "', '"', '"'):
            result.append(tt)
    return result

def convert_time_noctx(t, is_pm_ish=False):
    """Convert a time string from PDF to HH:MM format.
    The PDF uses 12h format for all times.
    PM context: if is_pm_ish is True, hour < 12 gets +12."""
    if ':' not in t:
        return t
    parts = t.split(":")
    h = int(parts[0])
    m = int(parts[1])
    if is_pm_ish and h < 12:
        h += 12
    return f"{h:02d}:{m:02d}"

def process_month(month_name):
    """Process a month and return (prayer_times, iqamah_times)."""
    data_lines = parse_month_table(month_name)
    print(f"  {month_name}: {len(data_lines)} days")
    
    prayer_times = []
    iqamah_times = []
    
    # Track previous values for ditto resolution
    prev_begin = {}
    prev_jamaat = {}
    
    for line in data_lines:
        tokens = split_tokens(line)
        
        try:
            day = int(re.match(r'\d+', tokens[0]).group())
        except:
            continue
        
        # Get all time-like tokens
        time_tokens = get_time_tokens(tokens)
        
        if len(time_tokens) < 9:
            print(f"    WARNING day {day}: only {len(time_tokens)} time tokens: {line[:80]}")
            continue
        
        # Handle case where trailing ditto (isha jamaat) is truncated
        if len(time_tokens) == 9:
            # Missing last ditto for isha jamaat - add empty string
            time_tokens = list(time_tokens) + ['']
        
        # First 5: beginning times (FAJR, SUNRISE, ZUHR, ASR, ISHA)
        # Next 5: jamaat times (FAJR, ZUHR, ASR, MAGHRIB, ISHA)
        begin_raw = time_tokens[:5]
        jamaat_raw = time_tokens[5:10]
        
        # Context for PM conversion
        # Beginning: FAJR=AM, SUNRISE=AM, ZUHR=PM, ASR=PM, ISHA=PM
        # Jamaat: FAJR=AM (usually), ZUHR=PM, ASR=PM, MAGHRIB=PM, ISHA=PM
        
        begin_pm = [False, False, True, True, True]
        jamaat_pm = [True, True, True, True, True]  # All jamaat times except fajr are PM; fajr jamaat is AM
        
        # Actually for Fajr jamaat: values like 7:15, 6:00, 5:35, 5:00, 4:30 - all AM
        jamaat_pm = [False, True, True, True, True]
        
        # Parse beginning times with ditto handling
        begin_fields = ['fajr', 'shurooq', 'dhuhr', 'asr', 'isha']
        begin_obj = {}
        for i, field in enumerate(begin_fields):
            val = resolve_ditto(begin_raw[i], prev_begin.get(field, ''))
            prev_begin[field] = val
            if ':' in val:
                begin_obj[field] = convert_time_noctx(val, begin_pm[i])
            else:
                begin_obj[field] = val
        
        # Parse jamaat times with ditto handling
        jamaat_fields = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        jamaat_obj = {}
        for i, field in enumerate(jamaat_fields):
            val = resolve_ditto(jamaat_raw[i], prev_jamaat.get(field, ''))
            prev_jamaat[field] = val
            if ':' in val:
                jamaat_obj[field] = convert_time_noctx(val, jamaat_pm[i])
            else:
                jamaat_obj[field] = val
        
        # Maghrib prayer time = Maghrib jamaat time (prayed at adhan)
        prayer_times.append({
            "date": day,
            "fajr": begin_obj.get('fajr', ''),
            "shurooq": begin_obj.get('shurooq', ''),
            "dhuhr": begin_obj.get('dhuhr', ''),
            "asr": begin_obj.get('asr', ''),
            "maghrib": jamaat_obj.get('maghrib', ''),
            "isha": begin_obj.get('isha', '')
        })
        
        iqamah_times.append({
            "date_range": str(day),
            "fajr": jamaat_obj.get('fajr', ''),
            "dhuhr": jamaat_obj.get('dhuhr', ''),
            "asr": jamaat_obj.get('asr', ''),
            "maghrib": jamaat_obj.get('maghrib', ''),
            "isha": jamaat_obj.get('isha', '')
        })
    
    return prayer_times, iqamah_times

# Jummah times from PDF: 2ND JUMMA TIMES 2026
# From 3 APRIL to 23 OCTOBER: Jumma at 3:30pm every week
jummah_schedule = {}
# Map each Friday's date to its jummah time
# 2026 Friday dates + jummah_iqamah from PDF
jummah_data = [
    (2, 1, "13:40"),   # 2nd Jan
    (9, 1, "13:50"),   # 9th Jan
    (16, 1, "14:00"),  # 16th Jan
    (23, 1, "14:10"),  # 23rd Jan
    (30, 1, "14:20"),  # 30th Jan
    (6, 2, "14:30"),   # 6th Feb
    (13, 2, "14:50"),  # 13th Feb
    (20, 2, "15:00"),  # 20th Feb
    (27, 2, "15:15"),  # 27th Feb
    (6, 3, "15:15"),   # 6th Mar
    (13, 3, "15:30"),  # 13th Mar
    (20, 3, "15:30"),  # 20th Mar
    (27, 3, "15:30"),  # 27th Mar
    # 3 Apr - 23 Oct: 15:30 every week (default for those months)
    (30, 10, "14:15"), # 30th Oct
    (6, 11, "14:00"),  # 6th Nov
    (13, 11, "13:50"), # 13th Nov
    (20, 11, "13:40"), # 20th Nov
    (27, 11, "13:40"), # 27th Nov
    (4, 12, "13:35"),  # 4th Dec
    (11, 12, "13:35"), # 11th Dec
    (18, 12, "13:40"), # 18th Dec
    (25, 12, "13:40"), # 25th Dec
]

for day, month_num, time in jummah_data:
    month_name = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"][month_num]
    if month_name not in jummah_schedule:
        jummah_schedule[month_name] = {}
    jummah_schedule[month_name][day] = time

# For April through October, Jumma is 3:30 every Friday
for month_name in ["APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER"]:
    if month_name not in jummah_schedule:
        jummah_schedule[month_name] = {}
    # All Fridays in the month (simplified: just use first Friday's time for the whole month)
    # Actually for Apr-Oct the PDF just says "3:30pm every week" - we can set the default
    pass

# For months with a single jummah time throughout, use the most common value
# Apr, May, Jun, Jul, Aug, Sep, Oct (until 23rd) → 15:30
# Nov, Dec → various times (handled above)

# Write JSON files
base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "public", "data", "mosques", "gb", "bolton", "taiyabah-masjid")
os.makedirs(base_dir, exist_ok=True)

all_months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
              "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]

for month in all_months:
    pt, iq = process_month(month)
    
    # Determine jummah for this month
    # For Apr-Oct: 15:30 (3:30pm)
    # For other months: use the schedule or default
    if month in ["APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER"]:
        jummah = "15:30"
    else:
        # Get from schedule - use the first Friday's time
        month_sched = jummah_schedule.get(month, {})
        if month_sched:
            sorted_days = sorted(month_sched.keys())
            jummah = month_sched[sorted_days[0]]
        else:
            jummah = "14:00"
    
    month_data = {
        "month": month,
        "prayer_times": pt,
        "iqamah_times": iq,
        "jummah_iqamah": jummah
    }
    
    filename = f"{month.lower()}.json"
    filepath = os.path.join(base_dir, filename)
    with open(filepath, "w") as f:
        json.dump(month_data, f, indent=2)
    print(f"  ✓ {filename}")

print(f"\nAll 12 files written to {base_dir}")
