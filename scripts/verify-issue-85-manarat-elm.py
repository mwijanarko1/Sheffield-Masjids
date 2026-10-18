#!/usr/bin/env python3
"""Verify manarat-foundation (HTML) and east-london-mosque (no 23:50 dhuhr).

Manarat: keep published source times (DST shift Oct27 on source). Exit nonzero on mismatch.
ELM: flag any dhuhr starting with 23: in october/november.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANARAT_DIR = ROOT / "public/data/mosques/gb/solihull/manarat-foundation"
ELM_DIR = ROOT / "public/data/mosques/gb/london/east-london-mosque"


def parse_12h(t: str) -> str | None:
    t = t.strip().upper().replace(".", "")
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)$", t)
    if not m:
        return None
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == "AM":
        if h == 12:
            h = 0
    else:
        if h != 12:
            h += 12
    return f"{h:02d}:{mi:02d}"


def parse_manarat_html(html: str) -> dict[int, dict]:
    cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", html, re.S | re.I)
    texts = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip() for c in cells]
    out: dict[int, dict] = {}
    i = 0
    while i < len(texts):
        if texts[i].isdigit() and 1 <= int(texts[i]) <= 31:
            d = int(texts[i])
            chunk = texts[i + 1 : i + 12]  # 11 time fields; next cell is next day
            if len(chunk) == 11 and all(
                re.search(r"\d{1,2}:\d{2}\s*[AP]M", x, re.I) for x in chunk
            ):
                mapped = [parse_12h(x) for x in chunk]
                if all(mapped):
                    out[d] = {
                        "fajr": mapped[0],
                        "iq_fajr": mapped[1],
                        "shurooq": mapped[2],
                        "dhuhr": mapped[3],
                        "iq_dhuhr": mapped[4],
                        "asr": mapped[5],
                        "iq_asr": mapped[6],
                        "maghrib": mapped[7],
                        "iq_maghrib": mapped[8],
                        "isha": mapped[9],
                        "iq_isha": mapped[10],
                    }
                    i += 12
                    continue
        i += 1
    return out


def load_static(path: Path):
    data = json.loads(path.read_text())
    pts = {d["date"]: d for d in data["prayer_times"]}
    iqs: dict[int, dict] = {}
    for e in data["iqamah_times"]:
        key = e["date_range"]
        if "-" in key:
            a, b = map(int, key.split("-"))
            for d in range(a, b + 1):
                iqs[d] = e
        else:
            iqs[int(key)] = e
    return pts, iqs


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; sheffield-masjids-verify/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def check_manarat() -> list[str]:
    diffs: list[str] = []
    for month, url_m in [("october", 10), ("november", 11)]:
        url = f"https://manaratfoundation.org.uk/prayer-timetable/?month={url_m}"
        html = fetch(url)
        src = parse_manarat_html(html)
        if len(src) < 28:
            diffs.append(f"manarat {month}: only parsed {len(src)} days from source")
        pts, iqs = load_static(MANARAT_DIR / f"{month}.json")
        for d, a in sorted(src.items()):
            s = pts.get(d)
            iq = iqs.get(d)
            if not s:
                diffs.append(f"manarat {month} d{d}: missing")
                continue
            for f in ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"]:
                if s.get(f) != a[f]:
                    diffs.append(
                        f"manarat {month} d{d} {f}: static={s.get(f)} src={a[f]}"
                    )
            for f, k in [
                ("fajr", "iq_fajr"),
                ("dhuhr", "iq_dhuhr"),
                ("asr", "iq_asr"),
                ("maghrib", "iq_maghrib"),
                ("isha", "iq_isha"),
            ]:
                if (iq or {}).get(f) != a[k]:
                    diffs.append(
                        f"manarat {month} d{d} iq.{f}: "
                        f"static={(iq or {}).get(f)} src={a[k]}"
                    )
    return diffs


def check_elm() -> list[str]:
    diffs: list[str] = []
    for month in ("october", "november"):
        path = ELM_DIR / f"{month}.json"
        data = json.loads(path.read_text())
        for row in data["prayer_times"]:
            dhuhr = row.get("dhuhr", "")
            if isinstance(dhuhr, str) and dhuhr.startswith("23:"):
                diffs.append(f"elm {month} d{row['date']} dhuhr={dhuhr}")
    return diffs


def main() -> int:
    diffs = check_manarat() + check_elm()
    print(f"diffs={len(diffs)}")
    for line in diffs:
        print(line)
    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main())
