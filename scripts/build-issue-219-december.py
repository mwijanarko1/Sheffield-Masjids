#!/usr/bin/env python3
"""Build December 2026 JSON for issue #219 mosques with published sources."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/issue219")


def write_month(rel: str, payload: dict) -> None:
    out = ROOT / "public/data/mosques" / rel / "december.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {out.relative_to(ROOT)} days={len(payload['prayer_times'])} iq={len(payload['iqamah_times'])} jummah={payload.get('jummah_iqamah')!r}")


def parse_12h(token: str, prayer: str) -> str:
    token = token.strip().upper().replace(".", "")
    m = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", token)
    if not m:
        raise ValueError(f"bad time {token!r}")
    hour = int(m.group(1))
    minute = m.group(2)
    meridiem = m.group(3)
    if meridiem:
        if meridiem == "PM" and hour != 12:
            hour += 12
        if meridiem == "AM" and hour == 12:
            hour = 0
    elif prayer in {"asr", "maghrib", "isha"} and hour < 12:
        hour += 12
    elif prayer == "dhuhr" and hour < 10:
        hour += 12
    elif prayer == "fajr" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def ashton() -> None:
    soup = BeautifulSoup((TMP / "ashton.html").read_text(encoding="utf-8", errors="replace"), "html.parser")
    table = soup.find_all("table")[1]
    prayer_times = []
    iqamah_times = []
    for tr in table.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        # Date, Fajr S/J, Sunrise, Zuhr S/J, Asr S/J, Maghrib S/J, Isha S/J
        if len(cells) != 12:
            continue
        day_m = re.match(r"[A-Za-z]{3}\s+(\d{1,2})$", cells[0])
        if not day_m:
            continue
        day = int(day_m.group(1))
        fajr_s, fajr_j, sunrise, dhuhr_s, dhuhr_j, asr_s, asr_j, mag_s, mag_j, isha_s, isha_j = cells[1:]
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr_s,
                "shurooq": sunrise,
                "dhuhr": dhuhr_s,
                "asr": asr_s,
                "maghrib": mag_s,
                "isha": isha_s,
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": fajr_j,
                "dhuhr": dhuhr_j,
                "asr": asr_j,
                "maghrib": mag_j,
                "isha": isha_j,
            }
        )
    write_month(
        "gb/ashton-under-lyne/ashton-central-mosque",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": "13:00",
        },
    )


def vali() -> None:
    data = json.loads((TMP / "vali.json").read_text(encoding="utf-8-sig"))
    prayer_times = []
    iqamah_times = []
    jummah = ""
    for row in data["days"]:
        day = int(row["date"])
        prayer_times.append(
            {
                "date": day,
                "fajr": row["begFajr"],
                "shurooq": row["sunrise"],
                "dhuhr": row["begDhuhr"],
                "asr": row["begAsar"],
                "maghrib": row["begMaghrib"],
                "isha": row["begEsha"],
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": row["jamFajr"] or row["begFajr"],
                "dhuhr": row["jamDhuhr"] or row["begDhuhr"],
                "asr": row["jamAsar"] or row["begAsar"],
                "maghrib": row["jamMaghrib"] or row["begMaghrib"],
                "isha": row["jamEsha"] or row["begEsha"],
            }
        )
        if row.get("jummah1") and not jummah:
            jummah = row["jummah1"]
    write_month(
        "gb/blackburn/masjid-e-vali",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah or "13:00",
        },
    )


def bushey() -> None:
    soup = BeautifulSoup((TMP / "bushey.html").read_text(encoding="utf-8", errors="replace"), "html.parser")
    table = soup.find_all("table")[2]
    prayer_times = []
    iqamah_times = []
    friday_jamaats = []

    def split_pair(label: str, text: str) -> tuple[str, str | None]:
        # e.g. "Fajr 5:59 AM 6:45 AM" or "Sunrise 7:41 AM"
        parts = re.findall(r"(\d{1,2}:\d{2}\s*[AP]M)", text, flags=re.I)
        if not parts:
            raise ValueError(text)
        start = parse_12h(parts[0], label)
        jamaat = parse_12h(parts[1], label) if len(parts) > 1 else None
        return start, jamaat

    for tr in table.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all(["th", "td"])]
        if len(cells) < 7 or not re.search(r"\d{1,2}\s+Dec", cells[0]):
            continue
        day = int(re.search(r"(\d{1,2})\s+Dec", cells[0]).group(1))
        fajr_s, fajr_j = split_pair("fajr", cells[1])
        sunrise, _ = split_pair("shurooq", cells[2])
        dhuhr_s, dhuhr_j = split_pair("dhuhr", cells[3])
        asr_s, asr_j = split_pair("asr", cells[4])
        mag_s, mag_j = split_pair("maghrib", cells[5])
        isha_s, isha_j = split_pair("isha", cells[6])
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr_s,
                "shurooq": sunrise,
                "dhuhr": dhuhr_s,
                "asr": asr_s,
                "maghrib": mag_s,
                "isha": isha_s,
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": fajr_j or fajr_s,
                "dhuhr": dhuhr_j or dhuhr_s,
                "asr": asr_j or asr_s,
                "maghrib": mag_j or mag_s,
                "isha": isha_j or isha_s,
            }
        )
        if "Fri" in cells[0] and dhuhr_j:
            friday_jamaats.append(dhuhr_j)

    # Winter: Khutbah 1:15pm (SOURCE.md); Friday Zuhr jama'ah is jummah.
    jummah = friday_jamaats[0] if friday_jamaats else "13:15"
    write_month(
        "gb/bushey/bushey-islamic-circle",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        },
    )


def nmic() -> None:
    prayer_times = []
    iqamah_times = []
    with (TMP / "nmic.csv").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["YEAR"] != "2026" or row["MONTH"] != "12":
                continue
            day = int(row["Date"])
            fajr_s = row["Fajr start"]
            fajr_j = row["Fajr Jamat"]
            sunrise = row["Sunrise"]
            dhuhr_s = row["Zuhr start"]
            dhuhr_j = parse_12h(row["Zuhr Jamat"], "dhuhr")
            asr1 = parse_12h(row["Asr 1 start"], "asr")
            asr2 = parse_12h(row["Asr 2 start"], "asr")
            asr_j = parse_12h(row["Asr Jamat"], "asr")
            mag_s = parse_12h(row["Maghrib start"], "maghrib")
            mag_j = parse_12h(row["Maghrib Jamat"], "maghrib")
            isha_s = parse_12h(row["Isha start"], "isha")
            isha_j = parse_12h(row["Isha Jamat"], "isha")
            entry = {
                "date": day,
                "fajr": fajr_s,
                "shurooq": sunrise,
                "dhuhr": dhuhr_s,
                "asr": asr1,
                "asr_mithl2": asr2,
                "maghrib": mag_s,
                "isha": isha_s,
            }
            prayer_times.append(entry)
            iq = {
                "date_range": str(day),
                "fajr": fajr_j,
                "dhuhr": dhuhr_j,
                "asr": asr_j,
                "maghrib": mag_j,
                "isha": isha_j,
            }
            if row["DAY"] == "Fri":
                iq["jummah"] = "12:40 / 13:30"
            iqamah_times.append(iq)
    write_month(
        "gb/glasgow/newton-mearns-islamic-centre",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": "12:40 / 13:30",
        },
    )


def humera() -> None:
    beginning = {}
    with (TMP / "salah-beginning-year.tsv").open(encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if row["DATE"].endswith("/12/2026"):
                beginning[int(row["DATE"].split("/")[0])] = row

    jamat = {}
    with (TMP / "humera.csv").open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["DATE"].endswith("/12/2026"):
                jamat[int(row["DATE"].split("/")[0])] = row

    # ASR column may use a fancy apostrophe
    asr_key = next(k for k in next(iter(jamat.values())).keys() if "ASR" in k.upper() or "ASR" in k)

    prayer_times = []
    iqamah_times = []
    for day in range(1, 32):
        b = beginning[day]
        j = jamat[day]
        prayer_times.append(
            {
                "date": day,
                "fajr": b["FAJR"],
                "shurooq": b["SUNRISE"],
                "dhuhr": b["DHUHR"],
                "asr": parse_12h(b["ASR 1"], "asr"),
                "asr_mithl2": parse_12h(b["ASR 2"], "asr"),
                "maghrib": parse_12h(b["MAGHRIB"], "maghrib"),
                "isha": parse_12h(b["ESHA"], "isha"),
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": parse_12h(j["FAJR"], "fajr"),
                "dhuhr": parse_12h(j["DHUHR"], "dhuhr"),
                "asr": parse_12h(j[asr_key], "asr"),
                "maghrib": parse_12h(j["MAGHRIB"], "maghrib"),
                "isha": parse_12h(j["ESHA"], "isha"),
            }
        )
    # Friday dhuhr jamat often is jumuah; keep empty like prior months if unclear.
    friday_dhuhr = sorted({iqamah_times[d - 1]["dhuhr"] for d in (4, 11, 18, 25)})
    jummah = friday_dhuhr[0] if len(friday_dhuhr) == 1 else ""
    write_month(
        "gb/london/masjid-al-humera",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        },
    )


def mkma() -> None:
    soup = BeautifulSoup((TMP / "mkma.html").read_text(encoding="utf-8", errors="replace"), "html.parser")
    prayer_times = []
    iqamah_times = []

    def split_cell(text: str, prayer: str) -> tuple[str, str]:
        parts = [p.strip() for p in text.replace("\n", " ").split("|")]
        parts = [p for p in parts if p]
        if len(parts) == 1:
            # sometimes "3:55  | 3:55" already split; or single value
            times = re.findall(r"\d{1,2}:\d{2}", parts[0])
            if len(times) >= 2:
                return parse_12h(times[0], prayer), parse_12h(times[1], prayer)
            t = parse_12h(times[0], prayer)
            return t, t
        return parse_12h(parts[0], prayer), parse_12h(parts[1], prayer)

    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 8:
            continue
        m = re.match(r"(\d{1,2}),\s*[A-Z]{3}$", cells[0])
        if not m:
            continue
        day = int(m.group(1))
        fajr_s, fajr_j = split_cell(cells[2], "fajr")
        sunrise = parse_12h(re.search(r"\d{1,2}:\d{2}", cells[3]).group(0), "shurooq")
        dhuhr_s, dhuhr_j = split_cell(cells[4], "dhuhr")
        asr_s, asr_j = split_cell(cells[5], "asr")
        mag_s, mag_j = split_cell(cells[6], "maghrib")
        isha_s, isha_j = split_cell(cells[7], "isha")
        prayer_times.append(
            {
                "date": day,
                "fajr": fajr_s,
                "shurooq": sunrise,
                "dhuhr": dhuhr_s,
                "asr": asr_s,
                "maghrib": mag_s,
                "isha": isha_s,
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": fajr_j,
                "dhuhr": dhuhr_j,
                "asr": asr_j,
                "maghrib": mag_j,
                "isha": isha_j,
            }
        )

    # Jumu'ah cell shows 12:30 PM
    jummah = "12:30"
    write_month(
        "gb/milton-keynes/mkma-islamic-centre",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": jummah,
        },
    )


def essalam() -> None:
    soup = BeautifulSoup((TMP / "essalam.html").read_text(encoding="utf-8", errors="replace"), "html.parser")
    table = soup.find_all("table")[1]
    rows = []
    for tr in table.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all(["th", "td"])]
        if len(cells) < 8 or not cells[1].isdigit():
            continue
        rows.append(
            {
                "date": int(cells[1]),
                "fajr": cells[7],
                "shurooq": cells[6],
                "dhuhr": cells[5],
                "asr": cells[4],
                "maghrib": cells[3],
                "isha": cells[2],
            }
        )

    # Rolling table: Nov 20-30 then Dec days. Published feed currently skips Dec 1.
    december = []
    prev = 0
    in_dec = False
    for row in rows:
        if prev and row["date"] < prev:
            in_dec = True
        if in_dec:
            december.append(row)
        prev = row["date"]

    write_month(
        "nl/rotterdam/essalam-mosque",
        {
            "month": "DECEMBER",
            "prayer_times": december,
            "iqamah_times": [],
            "jummah_iqamah": "",
        },
    )


def ezzeitouna() -> None:
    data = json.loads((TMP / "ezzeitouna-monthly.json").read_text(encoding="utf-8"))
    prayer_times = []
    iqamah_times = []
    for row in data["days"]:
        day = row["dayNum"]
        prayer_times.append(
            {
                "date": day,
                "fajr": row["Fajr"]["adhan"],
                "shurooq": row["sunrise"],
                "dhuhr": row["Dhuhr"]["adhan"],
                "asr": row["Asr"]["adhan"],
                "maghrib": row["Maghrib"]["adhan"],
                "isha": row["Isha"]["adhan"],
            }
        )
        iq = {
            "date_range": str(day),
            "fajr": row["Fajr"]["iqamah"],
            "dhuhr": row["Dhuhr"]["iqamah"],
            "asr": row["Asr"]["iqamah"],
            "maghrib": row["Maghrib"]["iqamah"],
            "isha": row["Isha"]["iqamah"],
        }
        if row.get("isFriday"):
            iq["dhuhr"] = "12:15"
            iq["jummah"] = "12:15 / 13:00"
        iqamah_times.append(iq)
    write_month(
        "gb/london/masjid-ezzeitouna",
        {
            "month": "DECEMBER",
            "prayer_times": prayer_times,
            "iqamah_times": iqamah_times,
            "jummah_iqamah": "12:15 / 13:00",
        },
    )


def main() -> None:
    ashton()
    vali()
    bushey()
    nmic()
    humera()
    mkma()
    essalam()
    ezzeitouna()


if __name__ == "__main__":
    main()
