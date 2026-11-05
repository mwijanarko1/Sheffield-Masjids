#!/usr/bin/env python3
"""Recheck the 13 mosques that still have no november.json (issue #90).

Read-only: prints what each official source currently publishes. No writes.
"""

import json
import re
import subprocess
import sys

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def fetch(url, extra=None, data=None, timeout=45):
    cmd = ["curl", "-sS", "-L", "--max-time", str(timeout), "-A", UA]
    if extra:
        cmd += extra
    if data:
        cmd += ["--data", data]
    cmd += ["-w", "\n__STATUS__%{http_code} %{content_type} %{size_download}", url]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    out = r.stdout
    body, _, meta = out.rpartition("\n__STATUS__")
    parts = meta.split()
    return (parts[0] if parts else "?"), (body or ""), meta


CHECKS = []


def check(name):
    def deco(fn):
        CHECKS.append((name, fn))
        return fn

    return deco


@check("richmond-jamia-masjid / surrey-jamea-masjid (BCMA)")
def bcma():
    for city in ("Richmond", "Surrey"):
        url = f"http://www.thebcma.com/upload/PDF/{city}/SalahTimes.pdf"
        st, body, meta = fetch(url)
        print(f"  {city}: {st} {meta} bytes={len(body)}")
        open(f"/tmp/issue170/bcma-{city.lower()}.pdf", "wb").write(body.encode("latin-1", "ignore"))


@check("birmingham-muslim-foundation")
def bmf():
    st, body, meta = fetch("https://bmf1.co.uk/prayer-time/")
    print(f"  /prayer-time/: {st} {meta}")
    links = sorted(set(re.findall(r'href="([^"]*\.pdf[^"]*)"', body)))
    for l in links:
        print("   PDF:", l)
    months = re.findall(r"(November|December|Oct-Nov|Nov)[^<]{0,30}20\d\d", body, re.I)
    print("   month hints:", sorted(set(months))[:10])
    open("/tmp/issue170/bmf-page.html", "w").write(body)


@check("al-manaar-institute-bradford")
def manaar():
    for url in ("https://www.coib.org.uk", "https://www.airmyprayer.co.uk/brd-1015"):
        st, body, meta = fetch(url)
        print(f"  {url}: {st} {meta} len={len(body)}")
        if st == "200" and len(body) > 500:
            open(f"/tmp/issue170/manaar-{url.split('/')[2].split('.')[0]}.html", "w").write(body)


@check("bd5-masjid")
def bd5():
    st, body, meta = fetch("https://www.bd5masjid.com/prayer-times")
    print(f"  {st} {meta}")
    print("   November mentions:", body.lower().count("november"))
    open("/tmp/issue170/bd5.html", "w").write(body)


@check("shah-jalal-masjid-burnley")
def shahjalal():
    st, body, meta = fetch(
        "https://masjidbox.com/prayer-times/shah-jalal-masjid-and-burnley-islamic-cultural-centre"
    )
    print(f"  masjidbox: {st} {meta}")
    if st == "200":
        open("/tmp/issue170/shahjalal.html", "w").write(body)
        m = re.search(r"window\.REDUX_STATE\s*=\s*'([^']+)'", body)
        if m:
            import urllib.parse

            stt = json.loads(urllib.parse.unquote(m.group(1)))
            tt = stt["masjidbox"]["masjidboxAthany"]["timetable"]
            print("   rows:", len(tt), tt[0]["date"][:10], "->", tt[-1]["date"][:10])


@check("abdullah-quilliam-mosque")
def quilliam():
    st, body, meta = fetch("https://www.abdullahquilliam.org/prayer-times/")
    print(f"  /prayer-times/: {st} {meta}")
    pdfs = sorted(set(re.findall(r'href="([^"]*\.pdf[^"]*)"', body)))
    print("   PDFs:", pdfs[:10])
    imgs = sorted(set(re.findall(r'src="([^"]*\.(?:png|jpg|jpeg|webp)[^"]*)"', body)))
    print("   images:", imgs[:10])
    open("/tmp/issue170/quilliam.html", "w").write(body)


@check("masjid-umar-yma")
def yma():
    st, body, meta = fetch("https://www.ymasheffield.org/prayer-timetable")
    print(f"  {st} {meta}")
    for pat in [r'src="([^"]*(?:png|jpg|jpeg|webp|pdf)[^"]*)"', r'href="([^"]*(?:png|jpg|jpeg|webp|pdf)[^"]*)"']:
        for u in sorted(set(re.findall(pat, body)))[:8]:
            print("  ", u)
    print("   November on page:", "november" in body.lower())
    open("/tmp/issue170/yma.html", "w").write(body)


@check("al-azhar-mosque")
def azhar():
    st, body, meta = fetch(
        "https://alazharsouthshields.com/api/prayer-time",
        extra=["-H", "Content-Type: application/json"],
        data='{"month":11,"year":2026}',
    )
    print(f"  api: {st} {meta}")
    print("   body head:", body[:400].replace("\n", " "))
    open("/tmp/issue170/azhar-nov.json", "w").write(body)


@check("muslim-community-center-chicago")
def mcc():
    st, body, meta = fetch("https://mccchicago.org/")
    print(f"  home: {st} {meta}")
    pdfs = sorted(set(re.findall(r'href="([^"]*(?:PTT|Prayer|Timetable)[^"]*\.pdf[^"]*)"', body, re.I)))
    print("   PDFs:", pdfs[:10])
    print("   November on page:", "november" in body.lower())
    open("/tmp/issue170/mcc.html", "w").write(body)


@check("british-muslim-heritage-centre")
def bmhc():
    st, body, meta = fetch(
        "https://bmhc.org.uk/wp-admin/admin-ajax.php",
        extra=["-H", "Content-Type: application/x-www-form-urlencoded"],
        data="action=get_monthly_timetable&month=11",
    )
    print(f"  ajax month=11: {st} {meta}")
    print("   body head:", body[:300].replace("\n", " "))


@check("al-falah-mosque / masjid-salahuddin-stoke (Facebook only)")
def facebook():
    for url in [
        "https://www.facebook.com/AlFalahCheethamHill/",
        "https://www.facebook.com/masjidsalahuddinstoke/",
    ]:
        st, body, meta = fetch(url)
        print(f"  {url}: {st} {meta} len={len(body)}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for name, fn in CHECKS:
        if only and only not in name:
            continue
        print(f"== {name}")
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 - read-only probe
            print(f"  ! {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
