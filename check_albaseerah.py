#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

url = "https://albaseerah.com/monthly-prayer-timetable/"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

# Find all tables
tables = soup.find_all('table')
print(f"Found {len(tables)} tables")

# Look for prayer timetable data
for i, table in enumerate(tables):
    print(f"\n=== Table {i+1} ===")
    rows = table.find_all('tr')
    for row in rows[:15]:  # Print first 15 rows
        cells = row.find_all(['td', 'th'])
        row_data = [cell.get_text(strip=True) for cell in cells]
        print(" | ".join(row_data))
