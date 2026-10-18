#!/usr/bin/env python3
"""Fix issue #85 static October mismatches for eight mosques (batch A).

Sources (no calculated times):
- muslim-welfare-house-london: embedded table on mwht.org.uk/prayer-time/
- park-royal-community-centre / preston-city-mosque: MAWAQIT confData
- didsbury-mosque: ptp_download October 2026 PDF (text extract)
- al-sunnah-mosque: sky_prayer_get_monthly_timetable CSV upload
- madrasah-baytul-ilm / leagrave-hall-masjid-luton: DPT get_monthly_timetable HTML
- hamidiya-leicester: Masjidal timings API
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques" / "gb"
UA = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch(url: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def to_24h(raw: str, *, noon_pm_is_am: bool = False) -> str:
    t = raw.strip().lower().replace(".", ":")
    m12 = re.match(r"(\d{1,2}):(\d{2})\s*(am|pm)", t)
    if m12:
        h, mi, ap = int(m12.group(1)), m12.group(2), m12.group(3)
        if noon_pm_is_am and ap == "pm" and h == 11:
            # Source mislabels post-DST Dhuhr as 11:xx PM
            return f"{h:02d}:{mi}"
        if ap == "pm" and h != 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
        return f"{h:02d}:{mi}"
    m24 = re.match(r"(\d{1,2}):(\d{2})", t)
    if not m24:
        raise ValueError(f"bad time: {raw!r}")
    h, mi = int(m24.group(1)), m24.group(2)
    return f"{h:02d}:{mi}"


def add_minutes(hhmm: str, delta: int) -> str:
    h, m = map(int, hhmm.split(":"))
    total = (h * 60 + m + delta) % (24 * 60)
    return f"{total // 60:02d}:{total % 60:02d}"


def apply_iqamah_token(token: str, adhan: str) -> str:
    token = token.strip()
    if token.startswith("+") or token.startswith("-"):
        return add_minutes(adhan, int(token))
    if re.match(r"^\d{1,2}:\d{2}$", token):
        return to_24h(token)
    raise ValueError(f"bad iqamah token {token!r}")


def write_month(path: Path, prayer_times: list[dict], iqamah_times: list[dict], jummah: str) -> None:
    payload = {
        "month": "OCTOBER",
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": jummah,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {path.relative_to(ROOT)} days={len(prayer_times)}")


def preserve_jummah(path: Path, default: str) -> str:
    if path.exists():
        try:
            return json.loads(path.read_text()).get("jummah_iqamah") or default
        except Exception:
            return default
    return default


# --- 1. Muslim Welfare House London ---
def fix_mwht() -> None:
    html = fetch("https://mwht.org.uk/prayer-time/").decode("utf-8", "ignore")
    m = re.search(r'<div class="salah-timetable"[\s\S]*?</div>\s*</div>\s*</div>', html)
    if not m:
        raise RuntimeError("MWHT salah-timetable not found")
    section = m.group(0)
    prayer, iqamah = [], []
    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", section, re.I):
        tds = [re.sub(r"<[^>]+>", "", td).replace("\n", " ").strip() for td in re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr, re.I)]
        if len(tds) < 12 or not re.fullmatch(r"\d{1,2}", tds[0]):
            continue
        day = int(tds[0])
        # Begins/Jama'ah: Fajr, Sunrise, Zuhr, Asr, Maghrib, Isha
        fajr_b, fajr_j, sunrise, dhuhr_b, dhuhr_j, asr_b, asr_j, mag_b, mag_j, isha_b, isha_j = tds[1:12]
        prayer.append(
            {
                "date": day,
                "fajr": to_24h(fajr_b),
                "shurooq": to_24h(sunrise),
                "dhuhr": to_24h(dhuhr_b),
                "asr": to_24h(asr_b),
                "maghrib": to_24h(mag_b),
                "isha": to_24h(isha_b),
            }
        )
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": to_24h(fajr_j),
                "dhuhr": to_24h(dhuhr_j),
                "asr": to_24h(asr_j),
                "maghrib": to_24h(mag_j),
                "isha": to_24h(isha_j),
            }
        )
    path = DATA / "london/muslim-welfare-house-london/october.json"
    write_month(path, prayer, iqamah, preserve_jummah(path, "13:30"))


# --- 2 & 3. MAWAQIT ---
def extract_conf_array(html: str, key: str) -> list:
    m = re.search(rf'"{key}"\s*:\s*(\[)', html)
    if not m:
        raise RuntimeError(f"missing {key}")
    start = m.end() - 1
    depth = 0
    for i, ch in enumerate(html[start : start + 600000]):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return json.loads(html[start : start + i + 1])
    raise RuntimeError(f"unclosed {key}")


def extract_jumua(html: str) -> str:
    m = re.search(r'"jumua"\s*:\s*"([^"]+)"', html)
    jumua = m.group(1) if m else ""
    m2 = re.search(r'"jumua2"\s*:\s*"([^"]+)"', html)
    if m2 and m2.group(1):
        return f"{jumua} / {m2.group(1)}" if jumua else m2.group(1)
    return jumua or "13:30"


def fix_mawaqit(slug: str, rel_path: str) -> None:
    html = fetch(f"https://mawaqit.net/en/{slug}").decode("utf-8", "ignore")
    calendar = extract_conf_array(html, "calendar")
    iqama_cal = extract_conf_array(html, "iqamaCalendar")
    month = calendar[9]  # October
    iq_month = iqama_cal[9]
    prayer, iqamah = [], []
    for day_s in sorted(month.keys(), key=lambda x: int(x)):
        day = int(day_s)
        times = month[day_s]
        adhan = {
            "date": day,
            "fajr": to_24h(times[0]),
            "shurooq": to_24h(times[1]),
            "dhuhr": to_24h(times[2]),
            "asr": to_24h(times[3]),
            "maghrib": to_24h(times[4]),
            "isha": to_24h(times[5]),
        }
        prayer.append(adhan)
        iq = iq_month[day_s]
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": apply_iqamah_token(iq[0], adhan["fajr"]),
                "dhuhr": apply_iqamah_token(iq[1], adhan["dhuhr"]),
                "asr": apply_iqamah_token(iq[2], adhan["asr"]),
                "maghrib": apply_iqamah_token(iq[3], adhan["maghrib"]),
                "isha": apply_iqamah_token(iq[4], adhan["isha"]),
            }
        )
    path = DATA / rel_path / "october.json"
    write_month(path, prayer, iqamah, extract_jumua(html) or preserve_jummah(path, "13:30"))


# --- 4. Didsbury PDF ---
def fix_didsbury() -> None:
    import fitz

    raw = fetch("https://didsburymosque.org/prayer-times?ptp_download=2026-10")
    doc = fitz.open(stream=raw, filetype="pdf")
    text = doc[0].get_text("text")
    prayer, iqamah = [], []
    # Rows like: Sun\n18\n6\n06:11\n06:30\n07:41\n12:59\n13:30\n15:31\n16:00\n18:09\n19:29\n19:45
    # Day name, October day, hijri (or *label), then 10 times (maghrib single)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    # Find first weekday
    days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
    i = 0
    while i < len(lines):
        if lines[i] in days and i + 2 < len(lines) and re.fullmatch(r"\d{1,2}", lines[i + 1]):
            day = int(lines[i + 1])
            # skip hijri token (number or *Jumada...)
            j = i + 2
            if j < len(lines) and (re.fullmatch(r"\d{1,2}", lines[j]) or lines[j].startswith("*")):
                j += 1
            times = []
            while j < len(lines) and re.fullmatch(r"\d{1,2}:\d{2}", lines[j]) and len(times) < 10:
                times.append(lines[j])
                j += 1
            # FajrB FajrJ Sunrise DhuhrB DhuhrJ AsrB AsrJ Maghrib IshaB IshaJ
            if len(times) != 10:
                raise RuntimeError(f"didsbury day {day}: expected 10 times, got {times}")
            fb, fj, sr, db, dj, ab, aj, mg, ib, ij = times
            prayer.append(
                {
                    "date": day,
                    "fajr": to_24h(fb),
                    "shurooq": to_24h(sr),
                    "dhuhr": to_24h(db),
                    "asr": to_24h(ab),
                    "maghrib": to_24h(mg),
                    "isha": to_24h(ib),
                }
            )
            iqamah.append(
                {
                    "date_range": str(day),
                    "fajr": to_24h(fj),
                    "dhuhr": to_24h(dj),
                    "asr": to_24h(aj),
                    "maghrib": to_24h(mg),
                    "isha": to_24h(ij),
                }
            )
            i = j
            continue
        i += 1
    if len(prayer) != 31:
        raise RuntimeError(f"didsbury expected 31 days, got {len(prayer)}")
    path = DATA / "manchester/didsbury-mosque/october.json"
    write_month(path, prayer, iqamah, preserve_jummah(path, "13:30"))


# --- 5. Al-Sunnah sky CSV ---
def fix_alsunnah() -> None:
    html = fetch("https://alsunnahmcr.org/prayer-timetable/").decode("utf-8", "ignore")
    m = re.search(r"skyPrayerMonthly\s*=\s*(\{.*?\})\s*;", html)
    if not m:
        raise RuntimeError("skyPrayerMonthly missing")
    meta = json.loads(m.group(1))
    city = re.search(r'data-city-id="(\d+)"', html)
    if not city:
        raise RuntimeError("city_id missing")
    payload = urllib.parse.urlencode(
        {
            "action": "sky_prayer_get_monthly_timetable",
            "nonce": meta["nonce"],
            "city_id": city.group(1),
            "month": "10",
            "year": "2026",
            "time_format": "12",
            "show_hijri": "yes",
            "show_sunrise": "yes",
            "show_iqamah": "yes",
        }
    ).encode()
    obj = json.loads(fetch("https://alsunnahmcr.org/wp-admin/admin-ajax.php", data=payload))
    if not obj.get("success"):
        raise RuntimeError(obj)
    if obj["data"].get("source") != "csv":
        raise RuntimeError(f"expected uploaded csv, got {obj['data'].get('source')}")
    prayer, iqamah = [], []
    for row in obj["data"]["days"]:
        day = int(row["date"].split("-")[2])
        dhuhr = to_24h(row["dhuhr"], noon_pm_is_am=True)
        prayer.append(
            {
                "date": day,
                "fajr": to_24h(row["fajr"]),
                "shurooq": to_24h(row["sunrise"]),
                "dhuhr": dhuhr,
                "asr": to_24h(row["asr"]),
                "maghrib": to_24h(row["maghrib"]),
                "isha": to_24h(row["isha"]),
            }
        )
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": to_24h(row["fajr_iqamah"]),
                "dhuhr": to_24h(row["dhuhr_iqamah"], noon_pm_is_am=True),
                "asr": to_24h(row["asr_iqamah"]),
                "maghrib": to_24h(row["maghrib_iqamah"]),
                "isha": to_24h(row["isha_iqamah"]),
            }
        )
    path = DATA / "manchester/al-sunnah-mosque/october.json"
    write_month(path, prayer, iqamah, preserve_jummah(path, "13:30"))


# --- 6. Baytul Ilm DPT ---
def parse_dpt_standard(html: str) -> tuple[list[dict], list[dict]]:
    prayer, iqamah = [], []
    for tr in re.findall(r"<tr[^>]*>\s*([\s\S]*?)</tr>", html, flags=re.I):
        if not re.search(r"<td", tr, flags=re.I):
            continue
        tds = [re.sub(r"<[^>]+>", "", x).replace("\n", " ").strip() for x in re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr, flags=re.I)]
        if len(tds) < 13:
            continue
        day_m = re.search(r"(\d{1,2})", tds[0])
        if not day_m or "october" not in tds[0].lower():
            # some tables use "18 October 2026"
            if not day_m:
                continue
            if not re.search(r"oct", tds[0], re.I) and not re.search(r"2026", tds[0]):
                # still accept if first cell is date-like with October elsewhere in row
                if not re.search(r"october|oct\b", tds[0], re.I):
                    continue
        day = int(day_m.group(1))
        # Date Day FajrB FajrJ Sunrise DhuhrB DhuhrJ AsrB AsrJ MagB MagJ IshaB IshaJ
        prayer.append(
            {
                "date": day,
                "fajr": to_24h(tds[2]),
                "shurooq": to_24h(tds[4]),
                "dhuhr": to_24h(tds[5], noon_pm_is_am=("pm" in tds[5].lower() and tds[5].lower().startswith("11"))),
                "asr": to_24h(tds[7]),
                "maghrib": to_24h(tds[9]),
                "isha": to_24h(tds[11]),
            }
        )
        # Fix dhuhr 23:xx from 11:xx pm mislabel
        if prayer[-1]["dhuhr"].startswith("23:"):
            prayer[-1]["dhuhr"] = "11:" + prayer[-1]["dhuhr"][3:]
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": to_24h(tds[3]),
                "dhuhr": to_24h(tds[6]),
                "asr": to_24h(tds[8]),
                "maghrib": to_24h(tds[10]),
                "isha": to_24h(tds[12]),
            }
        )
    return prayer, iqamah


def fix_baytul() -> None:
    html = fetch(
        "https://baytulilm.org/wp-admin/admin-ajax.php",
        data=urllib.parse.urlencode({"action": "get_monthly_timetable", "month": "10"}).encode(),
    ).decode("utf-8", "ignore")
    prayer, iqamah = parse_dpt_standard(html)
    # normalize dhuhr after parse
    for row in prayer:
        if row["dhuhr"].startswith("23:"):
            row["dhuhr"] = "11:" + row["dhuhr"][3:]
    if len(prayer) != 31:
        raise RuntimeError(f"baytul days={len(prayer)}")
    path = DATA / "leicester/madrasah-baytul-ilm/october.json"
    write_month(path, prayer, iqamah, preserve_jummah(path, "13:30"))


# --- 7. Hamidiya Masjidal ---
def fix_hamidiya() -> None:
    api_key = "msj_pk_Utroot64MVfFeCctXUpm8YxxsMjKQZc0ZU-RBasALSY"
    widget = "SaocId5Az1h8C28-7xddA"
    headers = {
        "Accept": "application/vnd.masjidal.com.v1+json",
        "x-api-key": api_key,
        "Origin": "https://thehco.uk",
        "Referer": "https://thehco.uk/",
    }
    url = (
        "https://api.masjidal.com/timings?start_date=2026-10-01&end_date=2026-10-31"
        f"&include=iqamah&widget_id={widget}"
    )
    obj = json.loads(fetch(url, headers=headers))
    timings = obj["data"]["timings"]
    prayer, iqamah = [], []
    jummah = None
    for row in timings:
        # "Sunday, Oct 18, 2026"
        dm = re.search(r"Oct\s+(\d{1,2})", row["date"])
        if not dm:
            raise RuntimeError(row["date"])
        day = int(dm.group(1))
        s, q = row["salah"], row["iqamah"]
        dhuhr = to_24h(s["zuhr"], noon_pm_is_am=True)
        prayer.append(
            {
                "date": day,
                "fajr": to_24h(s["fajr"]),
                "shurooq": to_24h(s["sunrise"]),
                "dhuhr": dhuhr,
                "asr": to_24h(s["asr"]),
                "maghrib": to_24h(s["maghrib"]),
                "isha": to_24h(s["isha"]),
            }
        )
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": to_24h(q["fajr"]),
                "dhuhr": to_24h(q["zuhr"], noon_pm_is_am=True),
                "asr": to_24h(q["asr"]),
                "maghrib": to_24h(q["maghrib"]),
                "isha": to_24h(q["isha"]),
            }
        )
        if jummah is None and q.get("jummah1") and q["jummah1"] not in ("N/A", "n/a", ""):
            jummah = to_24h(q["jummah1"])
    path = DATA / "leicester/hamidiya-leicester/october.json"
    write_month(path, prayer, iqamah, jummah or preserve_jummah(path, "13:25"))


# --- 8. Leagrave dual-Asr DPT ---
def fix_leagrave() -> None:
    html = fetch(
        "https://leagravehallmasjid.com/wp-admin/admin-ajax.php",
        data=urllib.parse.urlencode({"action": "get_monthly_timetable", "month": "10"}).encode(),
    ).decode("utf-8", "ignore")
    prayer, iqamah = [], []
    for tr in re.findall(r"<tr[^>]*>\s*([\s\S]*?)</tr>", html, flags=re.I):
        if not re.search(r"<td", tr, flags=re.I):
            continue
        tds = [re.sub(r"<[^>]+>", "", x).replace("\n", " ").strip() for x in re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr, flags=re.I)]
        if len(tds) < 14:
            continue
        day_m = re.search(r"(\d{1,2})", tds[0])
        if not day_m or "october" not in tds[0].lower():
            continue
        day = int(day_m.group(1))
        # Date Day FajrB FajrJ Sunrise ZuhrB ZuhrJ AsrStd AsrHanafi AsrJ MagB MagJ IshaB IshaJ
        fajr_b, fajr_j, sunrise = tds[2], tds[3], tds[4]
        dhuhr_b, dhuhr_j = tds[5], tds[6]
        asr_std, _asr_hanafi, asr_j = tds[7], tds[8], tds[9]
        mag_b, mag_j, isha_b, isha_j = tds[10], tds[11], tds[12], tds[13]

        def aft(raw: str, prayer_name: str) -> str:
            t = to_24h(raw)
            # bare afternoon times without am/pm need +12
            if re.match(r"^\d{1,2}:\d{2}$", raw.strip()) and "am" not in raw.lower() and "pm" not in raw.lower():
                h = int(t.split(":")[0])
                if prayer_name in ("asr", "maghrib", "isha", "dhuhr") and 1 <= h <= 11:
                    t = f"{h + 12:02d}:{t.split(':')[1]}"
                if prayer_name == "dhuhr" and t.startswith("23:"):
                    t = "11:" + t[3:]
            return t

        dhuhr = aft(dhuhr_b, "dhuhr")
        if "pm" in dhuhr_b.lower() and dhuhr_b.lower().startswith("11"):
            dhuhr = to_24h(dhuhr_b, noon_pm_is_am=True)
        prayer.append(
            {
                "date": day,
                "fajr": aft(fajr_b, "fajr"),
                "shurooq": aft(sunrise, "fajr"),
                "dhuhr": dhuhr,
                "asr": aft(asr_std, "asr"),
                "maghrib": aft(mag_b, "maghrib"),
                "isha": aft(isha_b, "isha"),
            }
        )
        iqamah.append(
            {
                "date_range": str(day),
                "fajr": aft(fajr_j, "fajr"),
                "dhuhr": aft(dhuhr_j, "dhuhr"),
                "asr": aft(asr_j, "asr"),
                "maghrib": aft(mag_j, "maghrib"),
                "isha": aft(isha_j, "isha"),
            }
        )
    if len(prayer) != 31:
        raise RuntimeError(f"leagrave days={len(prayer)}")
    path = DATA / "luton/leagrave-hall-masjid-luton/october.json"
    write_month(path, prayer, iqamah, preserve_jummah(path, "13:30"))


def sample(path: Path, days: list[int]) -> None:
    data = json.loads(path.read_text())
    pt = {r["date"]: r for r in data["prayer_times"]}
    iq = {int(str(r["date_range"]).split("-")[0]): r for r in data["iqamah_times"]}
    print(f"\nVERIFY {path.parent.name}")
    for d in days:
        a, q = pt[d], iq[d]
        print(
            f"  {d}: adhan F{a['fajr']} D{a['dhuhr']} A{a['asr']} M{a['maghrib']} I{a['isha']} | "
            f"iqamah F{q['fajr']} D{q['dhuhr']} A{q['asr']} M{q['maghrib']} I{q['isha']}"
        )


def main() -> None:
    fix_mwht()
    fix_mawaqit(
        "park-royal-community-centre-london-nw10-6hf-united-kingdom",
        "london/park-royal-community-centre",
    )
    fix_mawaqit(
        "city-mosque-preston-preston-pr11yq-united-kingdom",
        "preston/preston-city-mosque",
    )
    fix_didsbury()
    fix_alsunnah()
    fix_baytul()
    fix_hamidiya()
    fix_leagrave()

    sample(DATA / "london/muslim-welfare-house-london/october.json", [18, 25, 26])
    sample(DATA / "london/park-royal-community-centre/october.json", [18, 26, 30])
    sample(DATA / "preston/preston-city-mosque/october.json", [18, 23, 25, 30])
    sample(DATA / "manchester/didsbury-mosque/october.json", [18, 23, 25, 30])
    sample(DATA / "manchester/al-sunnah-mosque/october.json", [18, 23, 24, 25, 26])
    sample(DATA / "leicester/madrasah-baytul-ilm/october.json", [18, 20, 26])
    sample(DATA / "leicester/hamidiya-leicester/october.json", [18, 23, 24])
    sample(DATA / "luton/leagrave-hall-masjid-luton/october.json", [18])


if __name__ == "__main__":
    main()
