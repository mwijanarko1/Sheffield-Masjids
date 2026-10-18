#!/usr/bin/env python3
"""Issue #85: refresh Bilal Huddersfield + Scarborough October from official APIs."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKEN = "959953737ae1f5b1240d4776aa13ba17f358140a479a07f17a8114fa49cab186"
NIC_HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}


def fetch_json(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def fix_dhuhr(t: str) -> str:
    if isinstance(t, str) and t.startswith("23:"):
        return "11:" + t[3:]
    return t


def refresh_bilal() -> None:
    path = ROOT / "public/data/mosques/gb/huddersfield/masjid-bilal-huddersfield/october.json"
    data = json.loads(path.read_text())
    prayer_times = []
    iqamah_times = []
    jummah = data.get("jummah_iqamah")
    for day in range(1, 32):
        url = (
            "https://ptp.nicsol.co.uk/public/api/v1/prayer-times/by-date-mosque"
            f"?mosqueId=2&date=2026-10-{day:02d}"
        )
        try:
            payload = fetch_json(url, NIC_HEADERS)
        except Exception as exc:
            print(f"bilal day {day}: {exc}")
            continue
        rows = payload.get("prayer_times") or []
        if not rows:
            continue
        p = rows[0]
        dhuhr = fix_dhuhr(p["dhuhr_begin"])
        prayer_times.append(
            {
                "date": day,
                "fajr": p["fajr_begin"],
                "shurooq": p["sunrise"],
                "dhuhr": dhuhr,
                "asr": p["asr_begin"],
                "maghrib": p["maghrib_begin"],
                "isha": p["isha_begin"],
            }
        )
        iqamah_times.append(
            {
                "date_range": str(day),
                "fajr": p["fajr_jamah"],
                "dhuhr": p["dhuhr_jamah"],
                "asr": p["asr_jamah"],
                "maghrib": p["maghrib_jamah"],
                "isha": p["isha_jamah"],
            }
        )
        if p.get("jummah_jamah1"):
            jummah = p["jummah_jamah1"]
    out = {"month": "OCTOBER", "prayer_times": prayer_times, "iqamah_times": iqamah_times}
    if jummah:
        out["jummah_iqamah"] = jummah
    path.write_text(json.dumps(out, indent=2) + "\n")
    print(f"bilal wrote {len(prayer_times)} days; sample18 asr_iq={iqamah_times[17]['asr']}")


def refresh_scarborough() -> None:
    path = ROOT / "public/data/mosques/gb/scarborough/scarborough-islamic-centre/october.json"
    data = json.loads(path.read_text())
    url = (
        "https://masjidal.com/api/v1/time/range"
        "?masjid_id=z0AWYBKj&masjid_detail=yes&from_date=2026-10-01&to_date=2026-10-31"
    )
    payload = fetch_json(url)
    # MasjidAl shapes vary; normalize
    days = payload.get("data") or payload.get("times") or payload
    if isinstance(days, dict):
        days = days.get("timings") or days.get("data") or []
    print("scarborough keys", list(payload.keys())[:20] if isinstance(payload, dict) else type(payload))
    # dump a small sample for inspection if unexpected
    sample_path = ROOT / "scripts/tmp-scarborough-sample.json"
    sample_path.write_text(json.dumps(payload, indent=2)[:8000])
    print("wrote sample to", sample_path)


if __name__ == "__main__":
    refresh_bilal()
    refresh_scarborough()
