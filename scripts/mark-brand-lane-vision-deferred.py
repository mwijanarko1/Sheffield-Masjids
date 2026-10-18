#!/usr/bin/env python3
"""Confirm Brand Lane IC is single-day embed only → [VISION-DEFERRED], no invented month."""
from __future__ import annotations

import re
import urllib.request
from pathlib import Path

URL = "https://www.brandlaneic.com/prayer-timings/"
OUT_DIR = Path("public/data/mosques/us/houston/brand-lane-islamic-center")
MARKER = OUT_DIR / "VISION-DEFERRED.txt"


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", "replace")

    pdfs = re.findall(r'href=["\']([^"\']+\.pdf[^"\']*)', html, re.I)
    iframes = re.findall(r'<iframe[^>]+src=["\']([^"\']+)', html, re.I)
    has_rawdah = "rawdah-wp-plugin" in html or "prayerTimes" in html
    # Single-day widget signals: Current Prayer / Daily Prayer with one set of times
    single_day = bool(re.search(r"Current Prayer|Daily Prayer", html, re.I)) and not pdfs

    print("pdfs", pdfs[:5])
    print("iframes", iframes[:5])
    print("rawdah/prayerTimes", has_rawdah)
    print("single_day_signals", single_day)

    months = list(OUT_DIR.glob("*.json"))
    print("existing month files", [p.name for p in months])

    if single_day and not pdfs:
        MARKER.write_text(
            "[VISION-DEFERRED]\n"
            "Source https://www.brandlaneic.com/prayer-timings/ exposes a single-day "
            "Rawdah/current-prayer embed only (no monthly PDF/table). "
            "Do not invent a month file.\n"
        )
        print(f"wrote {MARKER}")
    else:
        print("Unexpected: monthly source may exist — investigate before deferring")


if __name__ == "__main__":
    main()
