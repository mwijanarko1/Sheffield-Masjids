#!/usr/bin/env python3
"""Issue #125 decisions: November 2026 for birmingham-jame-masjid and didsbury-mosque.

Values were read visually (no OCR) from the official sources:
- Birmingham Jame Masjid: November 2026 timetable image linked from
  https://www.birminghamjamemasjid.org.uk/timetable
  (https://cdn.masjidbox.com/content/pictures/byjyj1xnahpvd6qvnfho8aei.webp).
  Footer: "ZOHAR AND JUMMA JAMAT AT 1.00 PM". Ditto marks (") are resolved to the
  value in the row above. Maghrib is a single "AZAN & JAMAT" column, so adhan = jamaat.
- Didsbury Mosque: https://didsburymosque.org/wp-content/uploads/2026/10/November-Timetable.pdf
  (linked from the homepage). Fridays print "12:00 13:00" (two Jumu'ahs). The PDF has no
  Maghrib prayer column, so Maghrib jamaat = sunset, as in the other Didsbury months.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public/data/mosques/gb"
D = '"'


def pm(t: str) -> str:
    h, m = t.split(":")
    h = int(h)
    if h < 12:
        h += 12
    return f"{h:02d}:{m}"


def am(t: str) -> str:
    h, m = t.split(":")
    return f"{int(h):02d}:{m}"


# date, fajr begins, fajr jamat, sunrise, zohr begins, asr begins, asr jamat,
# magrib azan & jamat, isha begins, isha jamat  (exactly as printed, " = ditto)
JAME = [
    (1, "5:08", "6:30", "7:04", "11:54", "2:48", "3:15", "4:41", "6:14", "6:30"),
    (2, "5:09", D, "7:06", D, "2:46", D, "4:39", "6:12", "7:30"),
    (3, "5:11", D, "7:07", D, "2:45", D, "4:37", "6:11", D),
    (4, "5:12", D, "7:09", D, "2:43", D, "4:35", "6:09", D),
    (5, "5:14", D, "7:11", D, "2:41", D, "4:34", "6:08", D),
    (6, "5:16", "6:45", "7:13", D, "2:40", "3:15", "4:32", "6:06", D),
    (7, "5:17", D, "7:15", D, "2:38", D, "4:30", "6:05", "6:30"),
    (8, "5:19", D, "7:17", D, "2:37", D, "4:28", "6:03", D),
    (9, "5:20", D, "7:18", D, "2:35", D, "4:27", "6:02", "7:30"),
    (10, "5:22", D, "7:20", "11:55", "2:33", D, "4:25", "6:01", D),
    (11, "5:23", D, "7:22", D, "2:32", D, "4:24", "5:59", D),
    (12, "5:25", D, "7:24", D, "2:31", D, "4:22", "5:58", D),
    (13, "5:26", D, "7:26", D, "2:29", "3:00", "4:20", "5:57", D),
    (14, "5:28", D, "7:27", D, "2:28", D, "4:19", "5:56", "6:30"),
    (15, "5:29", D, "7:29", D, "2:26", D, "4:18", "5:54", D),
    (16, "5:31", D, "7:31", D, "2:25", D, "4:16", "5:53", "7:30"),
    (17, "5:32", D, "7:33", "11:56", "2:24", D, "4:15", "5:52", D),
    (18, "5:34", D, "7:35", D, "2:23", D, "4:13", "5:51", D),
    (19, "5:35", D, "7:36", D, "2:21", D, "4:12", "5:50", D),
    (20, "5:36", "7:00", "7:38", D, "2:20", D, "4:11", "5:49", D),
    (21, "5:38", D, "7:40", D, "2:19", D, "4:10", "5:48", "6:30"),
    (22, "5:39", D, "7:41", "11:57", "2:18", D, "4:09", "5:48", D),
    (23, "5:41", D, "7:43", D, "2:17", D, "4:07", "5:47", "7:30"),
    (24, "5:42", D, "7:45", D, "2:16", D, "4:06", "5:46", D),
    (25, "5:43", D, "7:46", "11:58", "2:15", D, "4:05", "5:45", D),
    (26, "5:45", D, "7:48", D, "2:14", D, "4:04", "5:44", D),
    (27, "5:46", "7:15", "7:49", D, "2:13", D, "4:04", D, D),
    (28, "5:47", D, "7:51", "11:59", "2:13", D, "4:03", "5:43", "6:30"),
    (29, "5:48", D, "7:53", D, "2:12", D, "4:02", D, D),
    (30, "5:50", D, "7:54", D, "2:11", D, "4:01", "5:42", "7:30"),
]


def resolve_ditto(rows):
    out, prev = [], None
    for r in rows:
        r = list(r)
        for i, v in enumerate(r):
            if v == D:
                r[i] = prev[i]
        out.append(r)
        prev = r
    return out


def build_jame():
    prayer, iqamah = [], []
    for d, fb, fj, sr, zb, ab, aj, mg, ib, ij in resolve_ditto(JAME):
        prayer.append({"date": d, "fajr": am(fb), "shurooq": am(sr), "dhuhr": am(zb),
                       "asr": pm(ab), "maghrib": pm(mg), "isha": pm(ib)})
        iqamah.append({"date_range": str(d), "fajr": am(fj), "dhuhr": "13:00",
                       "asr": pm(aj), "maghrib": pm(mg), "isha": pm(ij)})
    return {"month": "NOVEMBER", "prayer_times": prayer, "iqamah_times": iqamah,
            "jummah_iqamah": "13:00"}


# date, fajr begin, fajr prayer, sunrise, dhuhr begin, dhuhr prayer, asr begin,
# asr prayer, sunset, isha begin, isha prayer  (" = ditto; FRI = "12:00 13:00")
FRI = "FRI"
DIDS = [
    (1, "05:38", "06:00", "07:08", "11:58", "13:30", "14:08", "14:08", "16:39", "18:03", "19:30"),
    (2, "05:40", D, "07:10", "11:58", D, "14:07", "14:07", "16:37", "18:02", D),
    (3, "05:42", D, "07:12", "11:58", D, "14:05", "14:05", "16:36", "18:00", D),
    (4, "05:44", D, "07:14", "11:58", D, "14:04", "14:04", "16:34", "17:58", D),
    (5, "05:45", D, "07:15", "11:58", D, "14:02", "14:02", "16:32", "17:57", D),
    (6, "05:47", "06:15", "07:17", "11:58", FRI, "14:01", "14:01", "16:30", "17:55", D),
    (7, "05:49", D, "07:19", "11:58", "13:30", "14:00", "14:00", "16:28", "17:54", D),
    (8, "05:51", D, "07:21", "11:58", D, "13:58", "13:58", "16:26", "17:52", D),
    (9, "05:53", D, "07:23", "11:58", D, "13:57", "13:57", "16:25", "17:51", D),
    (10, "05:55", D, "07:25", "11:58", D, "13:56", "13:56", "16:23", "17:49", D),
    (11, "05:57", D, "07:27", "11:58", D, "13:54", "13:54", "16:21", "17:48", D),
    (12, "05:59", D, "07:29", "11:58", D, "13:53", "13:53", "16:20", "17:47", D),
    (13, "06:01", "06:30", "07:31", "11:58", FRI, "13:52", "13:52", "16:18", "17:45", D),
    (14, "06:02", D, "07:32", "11:58", D, "13:51", "13:51", "16:17", "17:44", D),
    (15, "06:04", D, "07:34", "11:59", D, "13:50", "13:50", "16:15", "17:43", D),
    (16, "06:06", D, "07:36", "11:59", D, "13:48", "13:48", "16:14", "17:41", D),
    (17, "06:08", D, "07:38", "11:59", D, "13:47", "13:47", "16:12", "17:40", D),
    (18, "06:10", D, "07:40", "11:59", D, "13:46", "13:46", "16:11", "17:39", D),
    (19, "06:12", D, "07:42", "11:59", D, "13:45", "13:45", "16:09", "17:38", D),
    (20, "06:13", "06:45", "07:43", "12:00", FRI, "13:44", "13:44", "16:08", "17:37", D),
    (21, "06:15", D, "07:45", "12:00", "13:20", "13:43", "13:43", "16:07", "17:36", D),
    (22, "06:17", D, "07:47", "12:00", D, "13:43", "13:43", "16:06", "17:35", D),
    (23, "06:19", D, "07:49", "12:00", D, "13:42", "13:42", "16:04", "17:34", D),
    (24, "06:20", D, "07:50", "12:01", D, "13:41", "13:41", "16:03", "17:33", D),
    (25, "06:22", D, "07:52", "12:01", D, "13:40", "13:40", "16:02", "17:32", D),
    (26, "06:24", D, "07:54", "12:01", D, "13:39", "13:39", "16:01", "17:32", D),
    (27, "06:25", D, "07:55", "12:02", FRI, "13:39", "13:39", "16:00", "17:31", D),
    (28, "06:27", D, "07:57", "12:02", "13:20", "13:38", "13:38", "15:59", "17:30", D),
    (29, "06:28", D, "07:58", "12:02", D, "13:38", "13:38", "15:59", "17:30", D),
    (30, "06:30", D, "08:00", "12:03", D, "13:37", "13:37", "15:58", "17:29", D),
]


def build_didsbury():
    prayer, iqamah = [], []
    prev = None
    for r in DIDS:
        r = list(r)
        for i, v in enumerate(r):
            if v == D:
                # ditto: same as the row above; a ditto under a Friday cell refers to
                # the last non-Friday value in that column
                j = len(prayer) - 1
                src = prev[i]
                while src == FRI:
                    j -= 1
                    src = DIDS_RESOLVED[j][i]
                r[i] = src
        DIDS_RESOLVED.append(r)
        prev = r
        d, fb, fj, sr, db, dj, ab, aj, ss, ib, ij = r
        prayer.append({"date": d, "fajr": fb, "shurooq": sr, "dhuhr": db,
                       "asr": ab, "maghrib": ss, "isha": ib})
        row = {"date_range": str(d), "fajr": fj, "dhuhr": "12:00" if dj == FRI else dj,
               "asr": aj, "maghrib": ss, "isha": ij}
        if dj == FRI:
            row["jummah"] = "12:00 / 13:00"
        iqamah.append(row)
    return {"month": "NOVEMBER", "prayer_times": prayer, "iqamah_times": iqamah,
            "jummah_iqamah": "12:00 / 13:00"}


DIDS_RESOLVED = []


def write(rel, data):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2) + "\n")
    print("wrote", p)


if __name__ == "__main__":
    write("birmingham/birmingham-jame-masjid/november.json", build_jame())
    write("manchester/didsbury-mosque/november.json", build_didsbury())
