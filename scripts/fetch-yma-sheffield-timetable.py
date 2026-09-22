#!/usr/bin/env python3
"""Fetch Masjid Umar YMA Sheffield prayer timetables from ymasheffield.org.

Sources:
  - Current-month PDF on /prayer-timetable
  - Monthly blog posts (PNG timetable images; PDFs are JS-gated)

Downloads PDFs where available, runs pdftotext -layout, then parse-yma-sheffield-pdf.py.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/data/mosques/gb/sheffield/masjid-umar-yma"
TMP = Path("/tmp/yma-sheffield-fetch")

BLOG_POSTS: dict[str, str] = {
    "ramadhan": "https://www.ymasheffield.org/post/prayer-timetable-ramadhan-2026",
    "remaining-march": "https://www.ymasheffield.org/post/prayer-timetable-remaining-march-2026",
    "april": "https://www.ymasheffield.org/post/prayer-timetable-april-2026",
    "may": "https://www.ymasheffield.org/post/prayer-timetable-may-2026",
    "june": "https://www.ymasheffield.org/post/prayer-timetable-june-2026",
    "july": "https://www.ymasheffield.org/post/prayer-timetable-july-2026",
    "august": "https://www.ymasheffield.org/post/prayer-timetable-august-2026",
    "september": "https://www.ymasheffield.org/post/prayer-timetable-september-2026",
}

PRAYER_TIMETABLE_URL = "https://www.ymasheffield.org/prayer-timetable"
CURRENT_PDF_RE = re.compile(r'/_files/ugd/73fbd9_[a-f0-9]+\.pdf')
IMAGE_RE = re.compile(r'wow-image id="(73fbd9_[^"]+)"')
SKIP_IMAGE_IDS = ("9d38388823f043c189e3ad5cd1973da9", "0fa87a6ea5be44efa0861fa93203c318")


def curl(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["curl", "-sL", "-o", str(dest), url],
        check=True,
    )


def curl_text(url: str) -> str:
    return subprocess.check_output(["curl", "-sL", url], text=True)


def pdftotext(pdf: Path, txt: Path) -> None:
    subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=True)


def timetable_image_id(html: str) -> str | None:
    for img in dict.fromkeys(IMAGE_RE.findall(html)):
        if any(skip in img for skip in SKIP_IMAGE_IDS):
            continue
        return img.replace("~mv2.png", "")
    return None


def current_pdf_url() -> str | None:
    html = curl_text(PRAYER_TIMETABLE_URL)
    m = CURRENT_PDF_RE.search(html)
    if not m:
        return None
    return f"https://www.ymasheffield.org{m.group(0)}"


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    pdf_dir = TMP / "pdf"
    txt_dir = TMP / "txt"
    img_dir = TMP / "images"
    pdf_dir.mkdir(exist_ok=True)
    txt_dir.mkdir(exist_ok=True)
    img_dir.mkdir(exist_ok=True)

    pdf_url = current_pdf_url()
    if pdf_url:
        print(f"Current prayer-timetable PDF: {pdf_url}")
        curl(pdf_url, pdf_dir / "current.pdf")
        pdftotext(pdf_dir / "current.pdf", txt_dir / "september.txt")
    else:
        print("WARNING: no PDF on prayer-timetable page", file=sys.stderr)

    for slug, url in BLOG_POSTS.items():
        html = curl_text(url)
        media_id = timetable_image_id(html)
        if media_id:
            png_url = f"https://static.wixstatic.com/media/{media_id}~mv2.png"
            curl(png_url, img_dir / f"{slug}.png")
            print(f"  {slug}: image {media_id}")
        else:
            print(f"  {slug}: no timetable image found", file=sys.stderr)

    parser = ROOT / "scripts/parse-yma-sheffield-pdf.py"
    if list(txt_dir.glob("*.txt")):
        subprocess.run(
            [sys.executable, str(parser), str(txt_dir), str(OUT_DIR)],
            check=False,
        )

    print(f"\nOutput dir: {OUT_DIR}")
    print(f"PNG sources (vision/manual): {img_dir}")
    print("Note: blog PDFs are JS-gated; use PNG + extract-mosque-pdf-vision for months without .txt")


if __name__ == "__main__":
    main()
