#!/usr/bin/env python3
"""Build November 2026 for the two BCMA branches from the official PDFs.

Sources (read 5 Nov 2026):
  richmond-jamia-masjid  https://www.thebcma.com/upload/PDF/Richmond/SalahTimes.pdf
  surrey-jamea-masjid    https://www.thebcma.com/upload/PDF/Surrey/SalahTimes.pdf

Both PDFs carry a real text layer, so values are read exactly (no OCR, no calculation).
Merged iqamah cells appear only on the first row of their block; the block extent is
taken from where the next explicit value is printed.
"""

import json
import re
import subprocess
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "mosques"
TMP = Path("/tmp/bcma-november")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

TIME = r"\d{1,2}:\d{2} (?:AM|PM)"


def pdf_lines(url, name):
    TMP.mkdir(parents=True, exist_ok=True)
    pdf = TMP / f"{name}.pdf"
    if not pdf.exists():
        subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, url, "-o", str(pdf)], check=True)
    doc = fitz.open(pdf)
    return [l.strip() for l in doc[0].get_text().split("\n") if l.strip()]


def to24(s):
    m = re.fullmatch(r"(\d{1,2}):(\d{2}) (AM|PM)", s.strip())
    if not m:
        raise ValueError(f"bad time {s!r}")
    h, mi, ap = int(m.group(1)), m.group(2), m.group(3)
    if ap == "AM":
        if h == 12:
            h = 0
    elif h != 12:
        h += 12
    return f"{h:02d}:{mi}"


def minutes(t):
    h, m = (int(x) for x in t.split(":"))
    return h * 60 + m


def write(rel, data):
    path = DATA / rel / "november.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"  wrote {path.relative_to(ROOT)} ({len(data['prayer_times'])} days)")


def validate(label, data):
    for p in data["prayer_times"]:
        seq = [p[k] for k in ("fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")]
        assert seq == sorted(seq, key=minutes), f"{label} day {p['date']} out of order: {seq}"
        assert 600 <= minutes(p["dhuhr"]) <= 900, f"{label} day {p['date']} dhuhr {p['dhuhr']}"
    for p, q in zip(data["prayer_times"], data["iqamah_times"]):
        assert p["date"] == int(q["date_range"]), f"{label} day {p['date']} misaligned with iqamah {q}"
        for f in ("fajr", "dhuhr", "asr", "maghrib", "isha"):
            assert minutes(q[f]) >= minutes(p[f]), f"{label} day {p['date']} {f} iqamah {q[f]} before adhan {p[f]}"
    days = [p["date"] for p in data["prayer_times"]]
    assert days == list(range(1, 31)), f"{label} dates {days}"
    print(f"  {label}: OK")


# ---------------------------------------------------------------------------
# Richmond
# ---------------------------------------------------------------------------
def build_richmond():
    lines = pdf_lines(
        "http://www.thebcma.com/upload/PDF/Richmond/SalahTimes.pdf", "richmond"
    )
    rows = {}
    cur = None
    for i, line in enumerate(lines):
        is_date = bool(re.fullmatch(r"\d{1,2}(?:-Nov)?", line))
        next_is_day = i + 1 < len(lines) and bool(
            re.fullmatch(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\*{0,2}", lines[i + 1])
        )
        if is_date and next_is_day:
            cur = int(line.split("-")[0])
            rows[cur] = []
            continue
        if cur is not None and re.fullmatch(TIME, line):
            rows[cur].append(line)

    explicit = {}
    block_starts = {}
    for day in sorted(rows):
        v = rows[day]
        starts = {}
        if len(v) == 6:
            explicit[day] = [to24(x) for x in v]
            continue
        if len(v) == 10:  # day 1 carries all four merged iqamah headers
            fajr, fajr_iq, sunrise, dhuhr, dhuhr_iq, asr, asr_iq, maghrib, isha, isha_iq = (
                to24(x) for x in v
            )
            explicit[day] = [fajr, sunrise, dhuhr, asr, maghrib, isha]
            block_starts["fajr"] = fajr_iq
            block_starts["dhuhr"] = dhuhr_iq
            block_starts["asr"] = asr_iq
            block_starts["isha"] = isha_iq
            block_starts.setdefault("_changes", []).append((1, "fajr", fajr_iq))
            block_starts["_changes"].append((1, "dhuhr", dhuhr_iq))
            block_starts["_changes"].append((1, "asr", asr_iq))
            block_starts["_changes"].append((1, "isha", isha_iq))
            continue
        if len(v) == 9:  # day 7 restarts fajr, asr and isha blocks
            fajr, fajr_iq, sunrise, dhuhr, asr, asr_iq, maghrib, isha, isha_iq = (to24(x) for x in v)
            explicit[day] = [fajr, sunrise, dhuhr, asr, maghrib, isha]
            starts = {"fajr": fajr_iq, "asr": asr_iq, "isha": isha_iq}
        elif len(v) == 7:  # day 21 / 28 restart asr or fajr
            if day == 21:
                fajr, sunrise, dhuhr, asr, asr_iq, maghrib, isha = (to24(x) for x in v)
                explicit[day] = [fajr, sunrise, dhuhr, asr, maghrib, isha]
                starts = {"asr": asr_iq}
            else:
                fajr, fajr_iq, sunrise, dhuhr, asr, maghrib, isha = (to24(x) for x in v)
                explicit[day] = [fajr, sunrise, dhuhr, asr, maghrib, isha]
                starts = {"fajr": fajr_iq}
        else:
            raise SystemExit(f"richmond day {day}: unexpected {len(v)} time cells {v}")

        for field, value in starts.items():
            block_starts["_changes"].append((day, field, value))

    # Rebuild iqamah blocks from every printed change point.
    changes = {"fajr": [], "dhuhr": [], "asr": [], "isha": []}
    for day, field, value in sorted(block_starts["_changes"]):
        changes[field].append((day, value))

    def iqamah_on(field, day):
        value = None
        for start, v in changes[field]:
            if day >= start:
                value = v
        return value

    prayer, iqamah = [], []
    for day in range(1, 31):
        fajr, sunrise, dhuhr, asr, maghrib, isha = explicit[day]
        prayer.append({"date": day, "fajr": fajr, "shurooq": sunrise, "dhuhr": dhuhr,
                       "asr": asr, "maghrib": maghrib, "isha": isha})
        iqamah.append({
            "date_range": str(day),
            "fajr": iqamah_on("fajr", day),
            "dhuhr": iqamah_on("dhuhr", day),
            "asr": iqamah_on("asr", day),
            # Sheet prints "Five Minutes after the Athan" for Maghrib, so jamaat = sunset + 5.
            "maghrib": f"{(minutes(maghrib) + 5) // 60:02d}:{(minutes(maghrib) + 5) % 60:02d}",
            "isha": iqamah_on("isha", day),
        })

    print("  richmond iqamah blocks:", {k: v for k, v in changes.items()})
    out = {"month": "NOVEMBER", "prayer_times": prayer, "iqamah_times": iqamah, "jummah_iqamah": ""}
    validate("richmond", out)
    write("ca/richmond/richmond-jamia-masjid", out)


# ---------------------------------------------------------------------------
# Surrey
# ---------------------------------------------------------------------------
def build_surrey():
    """Columns: Day | Nov | Hijri | Fajr | Fajr@Masjid | Sunrise | Zawal | Dhuhr
    | Dhuhr@Masjid | Asr1 | Asr2 | Asr@Masjid | Sunset | Maghrib | Isha | Isha@Masjid"""
    lines = pdf_lines("http://www.thebcma.com/upload/PDF/Surrey/SalahTimes.pdf", "surrey")
    start = lines.index("Sun")
    rows, cur = [], None
    for line in lines[start:]:
        if re.fullmatch(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)", line):
            cur = [line]
            rows.append(cur)
            continue
        if cur is None or len(cur) >= 16:
            continue
        if "JUMUAH" in line.upper():
            break
        cur.append(line)

    if len(rows) != 30 or any(len(r) != 16 for r in rows):
        raise SystemExit(f"surrey: expected 30 rows of 16 cells, got {[len(r) for r in rows]}")

    prayer, iqamah = [], []
    for r in rows:
        (_day, nov, _hijri, fajr, fajr_iq, sunrise, _zawal, dhuhr, dhuhr_iq,
         asr1, _asr2, asr_iq, _sunset, maghrib, isha, isha_iq) = r
        maghrib24 = to24s(maghrib, "pm")
        prayer.append({
            "date": int(nov),
            "fajr": to24s(fajr, "am"),
            "shurooq": to24s(sunrise, "am"),
            "dhuhr": to24s(dhuhr, "pm"),
            "asr": to24s(asr1, "pm"),
            "maghrib": maghrib24,
            "isha": to24s(isha, "pm"),
        })
        iqamah.append({
            "date_range": str(int(nov)),
            "fajr": to24s(fajr_iq, "am"),
            "dhuhr": to24s(dhuhr_iq, "pm"),
            "asr": to24s(asr_iq, "pm"),
            "maghrib": maghrib24,
            "isha": to24s(isha_iq, "pm"),
        })

    out = {
        "month": "NOVEMBER",
        "prayer_times": prayer,
        "iqamah_times": iqamah,
        # Footer: "JUMUAH 1 @ 1:30 PM" and "JUMUAH 2 @ 2:30 PM"
        "jummah_iqamah": "13:30 / 14:30",
    }
    validate("surrey", out)
    write("ca/surrey/surrey-jamea-masjid", out)


def to24s(s, period):
    """Surrey prints bare 12h times; the period is fixed by the column."""
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", s)
    if not m:
        raise ValueError(f"bad time {s!r}")
    h, mi = int(m.group(1)), m.group(2)
    if period == "am":
        if h == 12:
            h = 0
    else:
        if h != 12:
            h += 12
    return f"{h:02d}:{mi}"


if __name__ == "__main__":
    build_richmond()
    build_surrey()
