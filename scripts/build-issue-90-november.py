#!/usr/bin/env python3
"""Build November 2026 for the sources that became available after issue #90 was opened.

Only machine-readable sources are handled here; PDF/image months are transcribed by
vision in their own builders so no value is ever guessed.

  * birmingham-muslim-foundation -> https://bmf1.co.uk/prayer-time/ November 2026 HTML table
  * al-azhar-mosque              -> POST https://alazharsouthshields.com/api/prayer-time

al-azhar stays on hold (issue #125): the API still returns an empty Isha *begin* on
every November day, so the month is not written.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def write(rel, data):
    path = DATA / rel / "november.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"wrote {path.relative_to(ROOT)} ({len(data['prayer_times'])} days)")


def minutes(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def validate(label, data):
    for p in data["prayer_times"]:
        seq = [p[k] for k in ("fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")]
        ordered = sorted(seq, key=minutes)
        assert seq == ordered, f"{label} day {p['date']} out of order: {seq}"
        assert 600 <= minutes(p["dhuhr"]) <= 900, f"{label} day {p['date']} dhuhr {p['dhuhr']}"
    days = [p["date"] for p in data["prayer_times"]]
    assert days == sorted(set(days)), f"{label} dates not ascending/unique"
    assert len(data["iqamah_times"]) == len(data["prayer_times"]), f"{label} iqamah/day count differs"
    print(f"  {label}: OK ({len(days)} days)")


# ---------------------------------------------------------------------------
# Birmingham Muslim Foundation — official November 2026 HTML table
# ---------------------------------------------------------------------------
def build_bmf():
    html = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "https://bmf1.co.uk/prayer-time/"],
        capture_output=True, text=True, errors="replace", check=True,
    ).stdout
    import re

    i = html.find("November 2026")
    if i < 0:
        raise SystemExit("November 2026 table not found on bmf1.co.uk/prayer-time/")
    cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", html[i:], re.S | re.I)
    flat = []
    for c in cells:
        t = re.sub(r"<[^>]+>", "", c).replace("&nbsp;", " ").strip()
        if t:
            flat.append(t)

    header = [
        "Nov 26", "Fajr Start", "Fajr Jamat", "Sunrise", "Zuhr Start", "Zuhr Jamat",
        "Asr Start", "Asr Jamat", "Magrib Start", "Magrib Jamat", "Isha Start", "Isha Jamat",
    ]
    missing = [h for h in header if h not in flat]
    if missing:
        raise SystemExit(f"header cells missing: {missing}")
    start = flat.index(header[0]) + len(header)
    data = flat[start:]
    per = 12
    rows = [data[k:k + per] for k in range(0, len(data) - per + 1, per)]
    rows = [r for r in rows if re.fullmatch(r"\d{1,2}", r[0])]
    if len(rows) != 30:
        raise SystemExit(f"expected 30 day rows, got {len(rows)}")

    def norm(t):
        m = re.fullmatch(r"(\d{1,2}):(\d{2})", t)
        if not m:
            raise ValueError(f"unexpected time {t!r}")
        return f"{int(m.group(1)):02d}:{m.group(2)}"

    prayer, iqamah = [], []
    for r in rows:
        (day, fajr, fajr_iq, sunrise, zuhr, zuhr_iq,
         asr, asr_iq, maghrib, maghrib_iq, isha, isha_iq) = r
        prayer.append({
            "date": int(day), "fajr": norm(fajr), "shurooq": norm(sunrise),
            "dhuhr": norm(zuhr), "asr": norm(asr), "maghrib": norm(maghrib), "isha": norm(isha),
        })
        iqamah.append({
            "date_range": str(int(day)), "fajr": norm(fajr_iq), "dhuhr": norm(zuhr_iq),
            "asr": norm(asr_iq), "maghrib": norm(maghrib_iq), "isha": norm(isha_iq),
        })

    out = {
        "month": "NOVEMBER",
        "prayer_times": prayer,
        "iqamah_times": iqamah,
        "jummah_iqamah": "13:00",
    }
    validate("bmf", out)
    write("gb/birmingham/birmingham-muslim-foundation", out)


# ---------------------------------------------------------------------------
# Al Azhar Mosque — official JSON API (held, see module docstring)
# ---------------------------------------------------------------------------
API = "https://alazharsouthshields.com/api/prayer-time"


def fetch_azhar():
    body = subprocess.run(
        ["curl", "-sS", "--max-time", "45", "-A", UA,
         "-H", "Content-Type: application/json",
         "--data", '{"month":11,"year":2026}', API],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(body)["data"]["web"]


def report_azhar():
    web = fetch_azhar()
    blank = [r["date"] for r in web if not r["isha"]["begin"].strip()]
    print(f"al-azhar November 2026: {len(web)} rows, isha begin blank on {len(blank)} days -> held")


def build_azhar():
    web = fetch_azhar()
    blank = [r["date"] for r in web if not r["isha"]["begin"].strip()]
    if blank:
        raise SystemExit(
            f"holding al-azhar: isha begin blank on {len(blank)} of {len(web)} days "
            f"(issue #125 decision: wait for Isha start)"
        )


if __name__ == "__main__":
    which = sys.argv[1:] or ["bmf", "azhar"]
    if "bmf" in which:
        build_bmf()
    if "azhar" in which:
        report_azhar()
    if "azhar-build" in which:
        build_azhar()
