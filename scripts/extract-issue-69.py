#!/usr/bin/env python3
"""Refresh October (and optional November) JSON for GitHub issue #69 mosques from HTTP sources."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques" / "gb"
UA = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}

MONTH_UPPER = {10: "OCTOBER", 11: "NOVEMBER"}
MONTH_FILE = {10: "october", 11: "november"}


def fetch(url: str, *, data: bytes | None = None) -> str:
    req = urllib.request.Request(url, data=data, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as err:
        if err.code != 403 or data is not None:
            raise
        proc = subprocess.run(
            ["/usr/bin/curl", "-sL", "-A", UA["User-Agent"], url],
            check=True,
            capture_output=True,
            text=True,
        )
        return proc.stdout


def strip_td(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html).replace("\n", " ").strip()


def parse_time(raw: str, *, afternoon_ok: bool = False) -> str:
    t = raw.strip().lower()
    m12 = re.match(r"(\d{1,2}):(\d{2})\s*(am|pm)", t)
    if m12:
        h, mi, ap = int(m12.group(1)), m12.group(2), m12.group(3)
        if ap == "pm" and h != 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
        return f"{h:02d}:{mi}"
    m24 = re.match(r"(\d{1,2}):(\d{2})", t)
    if not m24:
        return ""
    h, mi = int(m24.group(1)), m24.group(2)
    if afternoon_ok and 1 <= h < 12:
        h += 12
    return f"{h:02d}:{mi}"


def parse_dpt_html(html: str, month_token: str = "october") -> list[dict]:
    rows: list[dict] = []
    inferred = 0
    for tr in re.findall(r"<tr[^>]*>\s*([\s\S]*?)</tr>", html, flags=re.I):
        if not re.search(r"<td", tr, flags=re.I):
            continue
        tds = [strip_td(x) for x in re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr, flags=re.I)]
        if len(tds) < 12:
            continue
        if month_token not in tds[0].lower():
            continue
        day_m = re.search(r"(\d{1,2})", tds[0])
        if day_m:
            day = int(day_m.group(1))
            inferred = day
        else:
            inferred += 1
            day = inferred

        fajr = parse_time(tds[2])
        fajr_iq = parse_time(tds[3])
        shurooq = parse_time(tds[4])
        dhuhr = parse_time(tds[5])
        dhuhr_iq = parse_time(tds[6])
        if len(tds) == 14:
            asr = parse_time(tds[7])
            asr_m2 = parse_time(tds[8])
            asr_iq = parse_time(tds[9])
            maghrib = parse_time(tds[10])
            mag_iq = parse_time(tds[11])
            isha = parse_time(tds[12])
            isha_iq = parse_time(tds[13])
        else:
            asr = parse_time(tds[7])
            asr_m2 = None
            asr_iq = parse_time(tds[8])
            maghrib = parse_time(tds[9])
            mag_iq = parse_time(tds[10])
            isha = parse_time(tds[11])
            isha_iq = parse_time(tds[12])

        pt: dict = {
            "date": day,
            "fajr": fajr,
            "shurooq": shurooq,
            "dhuhr": dhuhr,
            "asr": asr,
            "maghrib": maghrib,
            "isha": isha,
        }
        if asr_m2 and asr_m2 != asr:
            pt["asr_mithl2"] = asr_m2
        iq: dict = {
            "date_range": str(day),
            "fajr": fajr_iq,
            "dhuhr": dhuhr_iq,
            "asr": asr_iq,
            "maghrib": mag_iq or maghrib,
            "isha": isha_iq,
        }
        if re.match(r"friday\b", tds[1].strip(), flags=re.I):
            iq["jummah"] = dhuhr_iq
        rows.append({"prayer": pt, "iqamah": iq, "weekday": tds[1]})

    rows.sort(key=lambda r: r["prayer"]["date"])
    seen: set[int] = set()
    out: list[dict] = []
    for r in rows:
        d = r["prayer"]["date"]
        if d in seen:
            continue
        seen.add(d)
        out.append(r)
    return out


def month_payload(rows: list[dict], month_num: int) -> dict:
    prayer_times = [r["prayer"] for r in rows]
    iqamah_times = [r["iqamah"] for r in rows]
    fri = next((r for r in rows if re.match(r"friday\b", r["weekday"].strip(), flags=re.I)), None)
    jummah = (fri or rows[0])["iqamah"].get("jummah") or (fri or rows[0])["iqamah"]["dhuhr"]
    return {
        "month": MONTH_UPPER[month_num],
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }


def write_month(city: str, slug: str, month_num: int, payload: dict) -> Path:
    path = DATA / city / slug / f"{MONTH_FILE[month_num]}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def extract_dpt_mosque(city: str, slug: str, ajax_base: str, month_num: int) -> Path:
    sep = "&" if "?" in ajax_base else "?"
    url = f"{ajax_base}{sep}action=get_monthly_timetable&month={month_num}&display=all"
    html = fetch(url)
    token = MONTH_FILE[month_num]
    rows = parse_dpt_html(html, token)
    if not rows:
        raise RuntimeError(f"No DPT rows for {slug} month {month_num}")
    return write_month(city, slug, month_num, month_payload(rows, month_num))


def extract_birmingham_central(month_num: int) -> Path:
    if month_num != 10:
        raise RuntimeError("Birmingham Central MPTT HTML embed verified for October only")
    html = fetch("https://centralmosque.org.uk/timetable")
    m = re.search(r'<table class="dttable">(.*?)</table>', html, flags=re.S | re.I)
    if not m:
        raise RuntimeError("No dttable on Birmingham Central timetable page")
    rows: list[dict] = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", m.group(1), flags=re.S | re.I):
        tds = [strip_td(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.S | re.I)]
        if len(tds) < 14:
            continue
        day_m = re.search(r"(\d+)", tds[0])
        if not day_m:
            continue
        day = int(day_m.group(1))
        pt = {
            "date": day,
            "fajr": parse_time(tds[2]),
            "shurooq": parse_time(tds[4]),
            "dhuhr": parse_time(tds[6]),
            "asr": parse_time(tds[8]),
            "maghrib": parse_time(tds[10]),
            "isha": parse_time(tds[12]),
        }
        iq = {
            "date_range": str(day),
            "fajr": parse_time(tds[3]),
            "dhuhr": parse_time(tds[7]),
            "asr": parse_time(tds[9]),
            "maghrib": parse_time(tds[11]),
            "isha": parse_time(tds[13]),
        }
        if re.match(r"friday\b", tds[1].strip(), flags=re.I):
            iq["jummah"] = iq["dhuhr"]
        rows.append({"prayer": pt, "iqamah": iq, "weekday": tds[1]})
    rows.sort(key=lambda r: r["prayer"]["date"])
    return write_month("birmingham", "birmingham-central-mosque", month_num, month_payload(rows, month_num))


def extract_hikmah(month_num: int) -> Path:
    if month_num != 10:
        raise RuntimeError("Masjid Al Hikmah HTML table verified for October only")
    html = fetch("https://masjidalhikmah.org.uk/prayer-times/")
    rows: list[dict] = []
    for inner in re.findall(r'<tr class="prayer_row"[^>]*>(.*?)</tr>', html, flags=re.S | re.I):
        tds = [strip_td(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", inner, flags=re.S | re.I)]
        if len(tds) < 12:
            continue
        day_m = re.search(r"(\d+)\s+Oct", tds[0], flags=re.I)
        if not day_m:
            continue
        day = int(day_m.group(1))
        dhuhr_iq_raw = tds[5]
        jummah = None
        if "/" in dhuhr_iq_raw:
            parts = [p.strip() for p in dhuhr_iq_raw.split("/")]
            dhuhr_iq = parse_time(parts[0])
            jummah = parse_time(parts[-1])
        else:
            dhuhr_iq = parse_time(dhuhr_iq_raw)
        mag_ad = parse_time(tds[8])
        if tds[9].strip().startswith("+"):
            mag_iq = (datetime.strptime(mag_ad, "%H:%M") + timedelta(minutes=5)).strftime("%H:%M")
        else:
            mag_iq = parse_time(tds[9])
        pt = {
            "date": day,
            "fajr": parse_time(tds[1]),
            "shurooq": parse_time(tds[3]),
            "dhuhr": parse_time(tds[4]),
            "asr": parse_time(tds[6]),
            "maghrib": mag_ad,
            "isha": parse_time(tds[10]),
        }
        iq = {
            "date_range": str(day),
            "fajr": parse_time(tds[2]),
            "dhuhr": dhuhr_iq,
            "asr": parse_time(tds[7]),
            "maghrib": mag_iq,
            "isha": parse_time(tds[11]),
        }
        if jummah:
            iq["jummah"] = jummah
        rows.append({"prayer": pt, "iqamah": iq, "weekday": ""})
    rows.sort(key=lambda r: r["prayer"]["date"])
    payload = month_payload(rows, month_num)
    fri = next((r for r in rows if r["iqamah"].get("jummah")), None)
    if fri:
        payload["jummah_iqamah"] = fri["iqamah"]["jummah"]
    return write_month("aberdeen", "masjid-al-hikmah", month_num, payload)


def extract_al_medinah(month_num: int, year: int = 2026) -> Path:
    body = urllib.parse.urlencode({"month": month_num, "year": year}).encode()
    raw = json.loads(
        fetch("https://almedinah.co.uk/api/prayer-time", data=body)
    )
    rows: list[dict] = []
    for row in raw["data"]["web"]:
        day = int(row["date"])
        pt = {
            "date": day,
            "fajr": parse_time(row["fajr"]["begin"]),
            "shurooq": parse_time(row["fajr"]["sunrise"]),
            "dhuhr": parse_time(row["zuhr"]["begin"]),
            "asr": parse_time(row["asr"]["begin"], afternoon_ok=True),
            "maghrib": parse_time(row["maghrib"]["begin"], afternoon_ok=True),
            "isha": parse_time(row["isha"]["begin"], afternoon_ok=True),
        }
        iq = {
            "date_range": str(day),
            "fajr": parse_time(row["fajr"]["jamah"]),
            "dhuhr": parse_time(row["zuhr"]["jamah"], afternoon_ok=True),
            "asr": parse_time(row["asr"]["jamah"], afternoon_ok=True),
            "maghrib": parse_time(row["maghrib"]["jamah"], afternoon_ok=True),
            "isha": parse_time(row["isha"]["jamah"], afternoon_ok=True),
        }
        rows.append({"prayer": pt, "iqamah": iq, "weekday": ""})
    fridays = {2, 9, 16, 23, 30} if month_num == 10 else {6, 13, 20, 27}
    for r in rows:
        d = r["prayer"]["date"]
        if d in fridays:
            r["iqamah"]["jummah"] = r["iqamah"]["dhuhr"]
    payload = month_payload(rows, month_num)
    fri = next(r for r in rows if r["iqamah"].get("jummah"))
    payload["jummah_iqamah"] = fri["iqamah"]["jummah"]
    return write_month("brighton", "al-medinah-mosque", month_num, payload)


def to_hhmm_iso(iso: str) -> str:
    m = re.search(r"T(\d{2}):(\d{2})", iso or "")
    return f"{m.group(1)}:{m.group(2)}" if m else ""


def merge_masjidbox(city: str, slug: str, masjidbox_slug: str, month_num: int) -> Path:
    html = fetch(f"https://masjidbox.com/prayer-times/{masjidbox_slug}")
    m = re.search(r"REDUX_STATE\s*=\s*'([^']+)'", html)
    if not m:
        raise RuntimeError(f"No REDUX_STATE for {masjidbox_slug}")
    state = json.loads(urllib.parse.unquote(m.group(1)))
    tt = state.get("masjidbox", {}).get("masjidboxAthany", {}).get("timetable") or []
    if not tt:
        raise RuntimeError(f"Empty MasjidBox timetable for {masjidbox_slug}")

    path = DATA / city / slug / f"{MONTH_FILE[month_num]}.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    by_date_pt = {x["date"]: x for x in payload["prayer_times"]}
    by_date_iq = {int(x["date_range"].split("-")[0]): x for x in payload["iqamah_times"]}

    for day in tt:
        d = int(day["date"][8:10])
        if int(day["date"][5:7]) != month_num:
            continue
        by_date_pt[d] = {
            "date": d,
            "fajr": to_hhmm_iso(day.get("fajr")),
            "shurooq": to_hhmm_iso(day.get("sunrise")),
            "dhuhr": to_hhmm_iso(day.get("dhuhr")),
            "asr": to_hhmm_iso(day.get("asr")),
            "maghrib": to_hhmm_iso(day.get("maghrib")),
            "isha": to_hhmm_iso(day.get("isha")),
        }
        iq = day.get("iqamah") or {}
        entry = {
            "date_range": str(d),
            "fajr": to_hhmm_iso(iq.get("fajr")) or by_date_pt[d]["fajr"],
            "dhuhr": to_hhmm_iso(iq.get("dhuhr")) or by_date_pt[d]["dhuhr"],
            "asr": to_hhmm_iso(iq.get("asr")) or by_date_pt[d]["asr"],
            "maghrib": to_hhmm_iso(iq.get("maghrib")) or by_date_pt[d]["maghrib"],
            "isha": to_hhmm_iso(iq.get("isha")) or by_date_pt[d]["isha"],
        }
        jumuah = iq.get("jumuah")
        if isinstance(jumuah, list) and jumuah:
            entry["jummah"] = to_hhmm_iso(jumuah[0])
        by_date_iq[d] = entry

    payload["prayer_times"] = [by_date_pt[d] for d in sorted(by_date_pt)]
    payload["iqamah_times"] = [by_date_iq[d] for d in sorted(by_date_iq)]
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def patch_madinat_oct9_isha() -> None:
    """Verified outside MasjidBox 7-day window (issue #69)."""
    path = DATA / "bradford" / "madinat-al-zahra" / "october.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    for iq in data["iqamah_times"]:
        if iq["date_range"] == "9":
            iq["isha"] = "20:00"
            break
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--month", type=int, default=10, choices=(10, 11))
    args = parser.parse_args()
    m = args.month
    written: list[str] = []

    written.append(str(extract_dpt_mosque(
        "bradford", "masjid-as-sunnah",
        "https://albaseerah.com/wp-admin/admin-ajax.php", m,
    )))
    written.append(str(extract_dpt_mosque(
        "birmingham", "masjid-abubakr-siddique",
        "https://www.masjidabubakr.org.uk/wp-admin/admin-ajax.php", m,
    )))
    try:
        written.append(str(extract_birmingham_central(m)))
    except RuntimeError as err:
        print(f"SKIP birmingham-central-mosque: {err}")
    written.append(str(extract_hikmah(m)))
    written.append(str(extract_al_medinah(m)))
    written.append(str(merge_masjidbox(
        "sheffield", "fatima-community-centre", "fatima-community-centre-1754779129430", m,
    )))
    written.append(str(merge_masjidbox(
        "bradford", "madinat-al-zahra", "madinat-al-zahra", m,
    )))
    if m == 10:
        patch_madinat_oct9_isha()

    print("Updated:")
    for p in written:
        print(f"  {p}")
    print("\n[VISION-DEFERRED] (PDF/image only — no HTTP monthly source):")
    for name in (
        "central-mosque-blackpool",
        "lozells-central-mosque",
        "al-huda-bolton",
        "masjid-noor-bradford",
        "shahjalal-jame-mosque",
    ):
        print(f"  {name}")
    print("\n[INSUFFICIENT-SOURCE] baitul-mukarram-sheffield: Firestore iqamah not publicly readable; adhan-only in repo.")


if __name__ == "__main__":
    main()
