#!/usr/bin/env python3
"""Parse BCMA SalahTimes.pdf (pdftotext -layout) into one monthly JSON file."""
import argparse
import json
import re
import subprocess
from pathlib import Path


def parse_time(value: str, prayer: str = "") -> str:
    value = value.strip().upper().replace("SUNSET", "").strip()
    if not value:
        return ""
    m = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", value)
    if not m:
        return ""
    hour = int(m.group(1))
    minute = m.group(2)
    meridiem = m.group(3)
    if meridiem:
        if meridiem == "PM" and hour != 12:
            hour += 12
        if meridiem == "AM" and hour == 12:
            hour = 0
    elif prayer in {"asr", "maghrib", "isha", "dhuhr"} and hour < 12:
        hour += 12
    return f"{hour:02d}:{minute}"


def parse_surrey_line(line: str) -> dict | None:
    # Tue   01    18 (Ra1)   4:31    5:30     6:26      1:09     1:11     1:30    4:54    5:51     6:30     7:53     7:55     9:42    9:50
    m = re.match(
        r"^\s*\w{3}\s+(\d{1,2})\s+\S+(?:\s+\([^)]+\))?\s+"
        r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+"
        r"(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})",
        line,
    )
    if not m:
        return None
    day = int(m.group(1))
    fajr, fajr_iq, shurooq = m.group(2), m.group(3), m.group(4)
    dhuhr, dhuhr_iq = m.group(6), m.group(7)
    asr, asr_iq = m.group(8), m.group(10)
    maghrib = m.group(12)
    isha, isha_iq = m.group(13), m.group(14)
    return {
        "date": day,
        "fajr": parse_time(fajr, "fajr"),
        "shurooq": parse_time(shurooq, "shurooq"),
        "dhuhr": parse_time(dhuhr, "dhuhr"),
        "asr": parse_time(asr, "asr"),
        "maghrib": parse_time(maghrib, "maghrib"),
        "isha": parse_time(isha, "isha"),
        "fajr_iq": parse_time(fajr_iq, "fajr"),
        "dhuhr_iq": parse_time(dhuhr_iq, "dhuhr"),
        "asr_iq": parse_time(asr_iq, "asr"),
        "maghrib_iq": parse_time(maghrib, "maghrib"),
        "isha_iq": parse_time(isha_iq, "isha"),
    }


def parse_richmond_line(line: str) -> dict | None:
    m = re.match(r"^\s*(\d{1,2})(?:-\w+)?\s+\w{3}", line, re.I)
    if not m:
        return None
    day = int(m.group(1))
    times = re.findall(r"(\d{1,2}:\d{2}\s*[ap]m)", line, re.I)
    n = len(times)
    if n < 6:
        return None

    def pt(i: int, prayer: str = "") -> str:
        return parse_time(times[i], prayer)

    empty_iq = {"fajr_iq": "", "dhuhr_iq": "", "asr_iq": "", "maghrib_iq": "", "isha_iq": ""}
    if n == 6:
        row = {
            "date": day,
            "fajr": pt(0, "fajr"),
            "shurooq": pt(1, "shurooq"),
            "dhuhr": pt(2, "dhuhr"),
            "asr": pt(3, "asr"),
            "maghrib": pt(4, "maghrib"),
            "isha": pt(5, "isha"),
            **empty_iq,
        }
    elif n == 7:
        row = {
            "date": day,
            "fajr": pt(0, "fajr"),
            "shurooq": pt(1, "shurooq"),
            "dhuhr": pt(2, "dhuhr"),
            "asr": pt(3, "asr"),
            "maghrib": pt(4, "maghrib"),
            "isha": pt(5, "isha"),
            "isha_iq": pt(6, "isha"),
            **{k: "" for k in empty_iq if k != "isha_iq"},
        }
    elif n == 8:
        row = {
            "date": day,
            "fajr": pt(0, "fajr"),
            "fajr_iq": pt(1, "fajr"),
            "shurooq": pt(2, "shurooq"),
            "dhuhr": pt(3, "dhuhr"),
            "asr": pt(4, "asr"),
            "asr_iq": pt(5, "asr"),
            "maghrib": pt(6, "maghrib"),
            "isha": pt(7, "isha"),
            "dhuhr_iq": "",
            "maghrib_iq": "",
            "isha_iq": "",
        }
    elif n == 9:
        row = {
            "date": day,
            "fajr": pt(0, "fajr"),
            "fajr_iq": pt(1, "fajr"),
            "shurooq": pt(2, "shurooq"),
            "dhuhr": pt(3, "dhuhr"),
            "asr": pt(4, "asr"),
            "asr_iq": pt(5, "asr"),
            "maghrib": pt(6, "maghrib"),
            "isha": pt(7, "isha"),
            "isha_iq": pt(8, "isha"),
            "dhuhr_iq": "",
            "maghrib_iq": "",
        }
    else:
        return None
    row["maghrib_iq"] = row.get("maghrib_iq") or row["maghrib"]
    return row


def pdf_to_text(pdf_url: str) -> str:
    raw = subprocess.check_output(["curl", "-sL", pdf_url])
    tmp = Path("/tmp/bcma-salah.pdf")
    tmp.write_bytes(raw)
    return subprocess.check_output(["pdftotext", "-layout", str(tmp), "-"], text=True)


def build_month(days: list[dict], month_name: str) -> dict:
    prayer_times = [
        {
            "date": d["date"],
            "fajr": d["fajr"],
            "shurooq": d["shurooq"],
            "dhuhr": d["dhuhr"],
            "asr": d["asr"],
            "maghrib": d["maghrib"],
            "isha": d["isha"],
        }
        for d in days
    ]
    iqamah_times = [
        {
            "date_range": str(d["date"]),
            "fajr": d["fajr_iq"] or d["fajr"],
            "dhuhr": d["dhuhr_iq"] or d["dhuhr"],
            "asr": d["asr_iq"] or d["asr"],
            "maghrib": d["maghrib_iq"] or d["maghrib"],
            "isha": d["isha_iq"] or d["isha"],
        }
        for d in days
    ]
    jummah = next((d["dhuhr_iq"] for d in days if d["date"] in {5, 12, 19, 26} and d["dhuhr_iq"]), "")
    if not jummah:
        jummah = iqamah_times[0]["dhuhr"] if iqamah_times else ""
    return {
        "month": month_name,
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_url")
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--variant", choices=["surrey", "richmond"], required=True)
    parser.add_argument("--month-file", default="september")
    parser.add_argument("--month-name", default="SEPTEMBER")
    args = parser.parse_args()

    text = pdf_to_text(args.pdf_url)
    parse_line = parse_surrey_line if args.variant == "surrey" else parse_richmond_line
    days: list[dict] = []
    for line in text.splitlines():
        row = parse_line(line)
        if row:
            days.append(row)
    days.sort(key=lambda d: d["date"])
    if not days:
        raise SystemExit("No prayer rows parsed")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    out = build_month(days, args.month_name)
    path = args.out_dir / f"{args.month_file}.json"
    path.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote {path} ({len(days)} days, jummah {out['jummah_iqamah']})")


if __name__ == "__main__":
    main()
