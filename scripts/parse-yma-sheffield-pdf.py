#!/usr/bin/env python3
"""Parse Masjid Umar YMA Sheffield monthly prayer PDFs (pdftotext -layout).

Source layout (one row per day):
  Day Date FajrStart FajrIqamah Sunrise DhuhrStart DhuhrIqamah AsrStart AsrIqamah
       MaghribSunset MaghribIqamah IshaStart IshaIqamah

Times are 12h without am/pm. Fajr/sunrise are AM; dhuhr onward are PM (+12 when hour < 12).
Ditto marks (\") repeat the previous value in that column.
"""
import json
import re
import sys
from pathlib import Path

MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

ROW_RE = re.compile(
    r"^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2})\s+(.+)$",
    re.IGNORECASE,
)


def to24_am(t: str) -> str:
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


def to24_pm(t: str) -> str:
    h, m = t.split(":")
    hh = int(h)
    if 1 <= hh <= 11:
        hh += 12
    return f"{hh:02d}:{m}"


def resolve_tokens(tokens: list[str]) -> list[str]:
    resolved: list[str] = []
    for tok in tokens:
        if tok == '"':
            if not resolved:
                raise ValueError("Ditto mark with no prior value")
            resolved.append(resolved[-1])
        else:
            resolved.append(tok)
    return resolved


def parse_month_text(text: str, month_name: str) -> dict | None:
    rows: list[dict] = []
    prev_times: list[str] | None = None

    for line in text.splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        wd, date_s, rest = m.group(1), m.group(2), m.group(3)
        parts = rest.split()
        if len(parts) < 8:
            continue
        # Pad short rows: trailing cells omitted when unchanged from previous day
        if len(parts) < 11 and prev_times is not None:
            parts = parts + ['"'] * (11 - len(parts))
        if len(parts) < 11:
            continue
        try:
            times = resolve_tokens(parts[:11])
        except ValueError:
            continue
        prev_times = times

        fajr, fajr_iq, sunrise, dhuhr, dhuhr_iq, asr, asr_iq, maghrib, maghrib_iq, isha, isha_iq = times
        rows.append(
            {
                "date": int(date_s),
                "weekday": wd.upper()[:3],
                "fajr": to24_am(fajr),
                "shurooq": to24_am(sunrise),
                "dhuhr": to24_pm(dhuhr),
                "asr": to24_pm(asr),
                "maghrib": to24_pm(maghrib),
                "isha": to24_pm(isha),
                "fajr_iq": to24_am(fajr_iq),
                "dhuhr_iq": to24_pm(dhuhr_iq),
                "asr_iq": to24_pm(asr_iq),
                "maghrib_iq": to24_pm(maghrib_iq),
                "isha_iq": to24_pm(isha_iq),
            }
        )

    if not rows:
        return None

    rows.sort(key=lambda r: r["date"])
    prayer_times = [
        {k: r[k] for k in ("date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha")}
        for r in rows
    ]
    iqamah_times = [
        {
            "date_range": str(r["date"]),
            "fajr": r["fajr_iq"],
            "dhuhr": r["dhuhr_iq"],
            "asr": r["asr_iq"],
            "maghrib": r["maghrib_iq"],
            "isha": r["isha_iq"],
        }
        for r in rows
    ]
    fri = next((r for r in rows if r["weekday"] == "FRI"), rows[0])
    return {
        "month": month_name,
        "prayer_times": prayer_times,
        "iqamah_times": iqamah_times,
        "jummah_iqamah": fri["dhuhr_iq"],
    }


def main() -> None:
    src_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)

    file_map = {
        "jan": "JANUARY", "feb": "FEBRUARY", "mar": "MARCH", "apr": "APRIL",
        "may": "MAY", "jun": "JUNE", "jul": "JULY", "aug": "AUGUST",
        "sep": "SEPTEMBER", "oct": "OCTOBER", "nov": "NOVEMBER", "dec": "DECEMBER",
    }
    found = {m: False for m in MONTHS}

    for txt in sorted(src_dir.glob("*.txt")):
        stem = txt.stem.lower()
        month_name = next((v for k, v in file_map.items() if stem.startswith(k)), None)
        if month_name is None:
            continue
        data = parse_month_text(txt.read_text(), month_name)
        if data is None:
            print(f"  SKIP {month_name}: no rows")
            continue
        path = out_dir / f"{month_name.lower()}.json"
        path.write_text(json.dumps(data, indent=2) + "\n")
        print(
            f"  Wrote {path} ({len(data['prayer_times'])} days, jummah {data['jummah_iqamah']})"
        )
        found[month_name] = True

    missing = [m for m in MONTHS if not found[m]]
    if missing:
        print(f"  Missing months: {', '.join(missing)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
