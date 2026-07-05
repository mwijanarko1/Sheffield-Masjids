import json
import calendar
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.wise-web.org/wp-admin/admin-ajax.php"
OUT_DIR = Path("public/data/mosques/gb/high-wycombe/wycombe-islamic-centre")

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]


def fetch_month(month_index: int):
    resp = requests.post(BASE_URL, data={
        "action": "get_monthly_timetable",
        "month": str(month_index),
    }, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return resp.text


def parse_table(html: str):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="dptTimetable")
    rows = table.find_all("tr") if table else []
    data = []
    for row in rows:
        cells = row.find_all(["td", "th"])
        texts = [c.get_text(strip=True) for c in cells]
        if not texts or not texts[0][0].isdigit():
            continue
        # texts: [Date, Day, FajrBeg, FajrJam, Sunrise, DhuhrBeg, DhuhrJam,
        #         AsrBeg, AsrJam, MaghribBeg, MaghribJam, IshaBeg, IshaJam]
        date_text = texts[0]
        day = int(date_text.split()[0])
        data.append({
            "date": day,
            "fajr": texts[2],
            "shurooq": texts[4],
            "dhuhr": texts[5],
            "asr": texts[7],
            "maghrib": texts[9],
            "isha": texts[11],
        })
    return data


def parse_iqamah(html: str):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="dptTimetable")
    rows = table.find_all("tr") if table else []
    data = []
    for row in rows:
        cells = row.find_all(["td", "th"])
        texts = [c.get_text(strip=True) for c in cells]
        if not texts or not texts[0][0].isdigit():
            continue
        day = int(texts[0].split()[0])
        data.append({
            "date_range": str(day),
            "fajr": texts[3],
            "dhuhr": texts[6],
            "asr": texts[8],
            "maghrib": texts[10],
            "isha": texts[12],
        })
    return data


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for idx, month_name in enumerate(MONTHS, start=1):
        html = fetch_month(idx)
        prayer_times = parse_table(html)
        iqamah_times = parse_iqamah(html)
        output = {
            "month": month_name.upper(),
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": "13:30" if 5 <= idx <= 9 else "13:15",  # Summer May-Sep, Winter Oct-Apr
        }
        (OUT_DIR / f"{month_name}.json").write_text(
            json.dumps(output, indent=2) + "\n"
        )
        print(f"Wrote {month_name}.json with {len(prayer_times)} days")


if __name__ == "__main__":
    main()
