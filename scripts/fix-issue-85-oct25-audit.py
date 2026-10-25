#!/usr/bin/env python3
"""Issue #85 follow-up (25 Oct 2026 audit batches): apply source-verified corrections.

Every value below was re-read from the mosque's official source on 25 Oct 2026:
- Aisha Walsall, Bathgate, Kuraby, Goldington: MasjidBox feeds embedded/linked by the
  mosque sites (masjidbox.com/prayer-times/<slug>, dated 7-day window).
- Masjid Al-Hikmah Aberdeen: https://masjidalhikmah.org.uk/prayer-times/ (October table).
- Muslim Welfare House London: https://mwht.org.uk/prayer-time/ (October monthly table).
- Muslim Welfare House Sheffield: https://www.mwhs.org.uk/ (site code publishes Maghrib
  iqamah = Maghrib start every day; data/october.json has no maghrib key).
- Al-Huda Sheffield: https://masjidhudasheff.com/ (dated today/tomorrow payload).
- WLICC: October 2026 PDF linked from https://www.wlicc.org/ (rendered, read visually).
- Essalam Rotterdam: https://www.essalamrotterdam.nl/gebedstijden/ (rolling table to 23 Nov).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "data" / "mosques"


def load(rel):
    p = ROOT / rel
    text = p.read_text()
    return p, json.loads(text), text


def save(p, data, original):
    out = json.dumps(data, indent=2, ensure_ascii=False)
    if original.endswith("\n"):
        out += "\n"
    p.write_text(out)


def adhan(d, day):
    return next(r for r in d["prayer_times"] if r["date"] == day)


def iq(d, day):
    return next(r for r in d["iqamah_times"] if r["date_range"] == str(day))


def set_jummah(row, value):
    """Insert/replace per-day jummah, keeping it as the last key like other files."""
    row.pop("jummah", None)
    row["jummah"] = value


# --- Aisha Mosque Walsall (MasjidBox aisha-mosque-walsall) ---
p, d, o = load("gb/walsall/aisha-mosque-and-islamic-centre/october.json")
for day in range(25, 32):
    iq(d, day)["fajr"] = "06:15"
for day, mag, isha in [(25, "16:55", "17:55"), (30, "16:45", "17:45"), (31, "16:43", "17:43")]:
    adhan(d, day)["maghrib"] = mag
    adhan(d, day)["isha"] = isha
    iq(d, day)["maghrib"] = mag
set_jummah(iq(d, 30), "12:20 / 13:20")
save(p, d, o)

# --- Bathgate (MasjidBox bathgatemosque) ---
p, d, o = load("gb/bathgate/bathgate-mosque/october.json")
set_jummah(iq(d, 30), "13:15")
save(p, d, o)

# --- Goldington (MasjidBox goldington-islamic-centre) ---
p, d, o = load("gb/bedford/goldington-islamic-centre/october.json")
iq(d, 30)["dhuhr"] = "13:30"
set_jummah(iq(d, 30), "13:30")
save(p, d, o)

# --- Kuraby (MasjidBox kurabymosque, Australia/Brisbane, no DST) ---
KURABY = {
    # day: (fajr, sunrise, dhuhr, asr, maghrib, isha), (iq fajr, dhuhr, asr, maghrib, isha)
    25: (("04:20", "05:02", "12:35", "16:20", "18:02", "19:35"), ("04:30", "12:45", "16:30", "18:02", "19:45")),
    26: (("04:20", "05:02", "12:35", "16:20", "18:02", "19:35"), ("04:30", "12:45", "16:30", "18:02", "19:45")),
    27: (("04:20", "05:01", "12:35", "16:20", "18:03", "19:35"), ("04:30", "12:45", "16:30", "18:03", "19:45")),
    28: (("04:20", "05:00", "12:35", "16:20", "18:04", "19:35"), ("04:30", "12:45", "16:30", "18:04", "19:45")),
    29: (("04:20", "04:59", "12:35", "16:20", "18:04", "19:35"), ("04:30", "12:45", "16:30", "18:04", "19:45")),
    30: (("04:05", "04:58", "12:35", "16:20", "18:05", "19:50"), ("04:15", "12:45", "16:30", "18:05", "20:00")),
    31: (("04:05", "04:57", "12:35", "16:20", "18:06", "19:50"), ("04:15", "12:45", "16:30", "18:06", "20:00")),
}
p, d, o = load("au/brisbane/kuraby-mosque/october.json")
have = {r["date"] for r in d["prayer_times"]}
for day, (a, q) in sorted(KURABY.items()):
    assert day not in have, day
    d["prayer_times"].append(dict(zip(["date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"], (day,) + a)))
    d["iqamah_times"].append(dict(zip(["date_range", "fajr", "dhuhr", "asr", "maghrib", "isha"], (str(day),) + q)))
set_jummah(iq(d, 23), "12:40 / 13:45")
set_jummah(iq(d, 30), "12:40 / 13:45")
save(p, d, o)

# --- Masjid Al-Hikmah Aberdeen (October table on masjidalhikmah.org.uk) ---
p, d, o = load("gb/aberdeen/masjid-al-hikmah/october.json")
for day in range(25, 31):  # 25-29 Dhuhr 13:00; Fri 30 Dhuhr jamaa'ah "1:00pm / 1:50pm" (first slot)
    iq(d, day)["dhuhr"] = "13:00"
for day in range(25, 32):
    iq(d, day)["isha"] = "20:15"
save(p, d, o)

# --- Muslim Welfare House London (mwht.org.uk October monthly table) ---
MWHL = {
    # day: (maghrib adhan, isha adhan, isha iqamah)
    26: ("16:48", "18:15", "18:45"),
    27: ("16:46", "18:13", "18:45"),
    28: ("16:44", "18:11", "18:45"),
    29: ("16:42", "18:09", "18:45"),
    30: ("16:40", "18:07", "18:45"),
    31: ("16:39", "18:06", "18:45"),
}
p, d, o = load("gb/london/muslim-welfare-house-london/october.json")
for day, (mag, isha, isha_iq) in MWHL.items():
    adhan(d, day)["maghrib"] = mag
    adhan(d, day)["isha"] = isha
    iq(d, day)["isha"] = isha_iq
adhan(d, 27)["asr"] = "14:14"
adhan(d, 29)["asr"] = "14:11"
save(p, d, o)

# --- Masjid Al-Huda Sheffield (dated today/tomorrow payload on masjidhudasheff.com) ---
p, d, o = load("gb/sheffield/masjid-al-huda-sheffield/october.json")
idx = next(i for i, r in enumerate(d["iqamah_times"]) if r["date_range"] == "25-31")
base = d["iqamah_times"][idx]
rows = []
for rng, mag in [("25", "16:51"), ("26", "16:49")]:
    r = {"date_range": rng, "fajr": base["fajr"], "dhuhr": base["dhuhr"], "asr": base["asr"],
         "maghrib": mag, "isha": base["isha"], "jummah": base["jummah"]}
    rows.append(r)
rest = dict(base)
rest["date_range"] = "27-31"
rows.append(rest)
d["iqamah_times"][idx:idx + 1] = rows
save(p, d, o)

# --- Muslim Welfare House Sheffield: textual edit to keep the mirrored upstream layout ---
p = ROOT / "gb/sheffield/muslim-welfare-house/october.json"
text = p.read_text()
src = json.loads(text)
old = """      {
        "date_range": "25-31",
        "fajr": "05:45",
        "dhuhr": "13:10",
        "asr": "14:30",
        "isha": "19:30",
        "jummah": "12:45"
      }"""
assert old in text
new_rows = []
for day in range(25, 32):
    mag = adhan(src, day)["maghrib"]
    new_rows.append(f"""      {{
        "date_range": "{day}",
        "fajr": "05:45",
        "dhuhr": "13:10",
        "asr": "14:30",
        "maghrib": "{mag}",
        "isha": "19:30",
        "jummah": "12:45"
      }}""")
p.write_text(text.replace(old, ",\n".join(new_rows)))

# --- WLICC (October 2026 PDF, rows 25-31 re-read in full) ---
WLICC = {
    # day: adhan (fajr, sunrise, dhuhr, asr, maghrib, isha), jamaah (fajr, dhuhr, asr, maghrib, isha)
    25: (("05:04", "06:39", "11:50", "14:16", "16:49", "18:16"), ("05:24", "13:30", "14:31", "16:59", "18:26")),
    26: (("05:05", "06:41", "11:49", "14:15", "16:47", "18:14"), ("05:25", "13:30", "14:30", "16:57", "18:30")),
    27: (("05:07", "06:43", "11:49", "14:13", "16:45", "18:12"), ("05:27", "13:30", "14:28", "16:55", "18:30")),
    28: (("05:09", "06:45", "11:49", "14:11", "16:43", "18:10"), ("05:29", "13:30", "14:26", "16:53", "18:30")),
    29: (("05:09", "06:45", "11:49", "14:11", "16:43", "18:10"), ("05:29", "13:30", "14:26", "16:53", "18:30")),
    30: (("05:09", "06:46", "11:49", "14:10", "16:41", "18:08"), ("05:29", "13:30", "14:25", "16:51", "18:30")),
    31: (("05:13", "06:50", "11:49", "14:07", "16:38", "18:05"), ("05:33", "13:30", "14:22", "16:48", "18:30")),
}
p, d, o = load("gb/london/west-london-islamic-cultural-centre/october.json")
for day, (a, q) in WLICC.items():
    ar = adhan(d, day)
    for k, v in zip(["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"], a):
        ar[k] = v
    qr = iq(d, day)
    for k, v in zip(["fajr", "dhuhr", "asr", "maghrib", "isha"], q):
        qr[k] = v
# PDF prints Dhuhr jamaa'ah 1:30 on every October Friday; homepage Jummah: 13.30 (Arabic) / 14:30 (English)
d["jummah_iqamah"] = "13:30"
set_jummah(iq(d, 30), "13:30 / 14:30")
save(p, d, o)

# --- Essalam Rotterdam (gebedstijden rolling table; adhan only, no jamaat published) ---
ESSALAM_TABLE = """
2026-10-31 05:40 07:27 12:31 14:53 17:24 18:58
2026-11-01 05:42 07:29 12:31 14:51 17:22 18:57
2026-11-02 05:43 07:31 12:31 14:50 17:20 18:55
2026-11-03 05:45 07:33 12:31 14:48 17:19 18:53
2026-11-04 05:46 07:34 12:31 14:47 17:17 18:52
2026-11-05 05:48 07:36 12:31 14:45 17:15 18:50
2026-11-06 05:50 07:38 12:31 14:44 17:13 18:49
2026-11-07 05:51 07:40 12:31 14:43 17:12 18:47
2026-11-08 05:53 07:42 12:31 14:41 17:10 18:46
2026-11-09 05:54 07:43 12:31 14:40 17:08 18:45
2026-11-10 05:56 07:45 12:31 14:39 17:07 18:43
2026-11-11 05:57 07:47 12:31 14:38 17:05 18:42
2026-11-12 05:59 07:49 12:31 14:37 17:04 18:41
2026-11-13 06:00 07:51 12:31 14:35 17:02 18:39
2026-11-14 06:02 07:52 12:31 14:34 17:01 18:38
2026-11-15 06:03 07:54 12:32 14:33 16:59 18:37
2026-11-16 06:04 07:56 12:32 14:32 16:58 18:36
2026-11-17 06:06 07:57 12:32 14:31 16:56 18:35
2026-11-18 06:07 07:59 12:32 14:30 16:55 18:34
2026-11-19 06:09 08:01 12:32 14:29 16:54 18:33
2026-11-20 06:10 08:03 12:33 14:28 16:53 18:32
2026-11-21 06:11 08:04 12:33 14:27 16:51 18:31
2026-11-22 06:13 08:06 12:33 14:27 16:50 18:30
2026-11-23 06:14 08:08 12:33 14:26 16:49 18:29
"""
nov = []
p, d, o = load("nl/rotterdam/essalam-mosque/october.json")
for line in ESSALAM_TABLE.strip().splitlines():
    date, *t = line.split()
    _, m, day = map(int, date.split("-"))
    row = dict(zip(["date", "fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"], [day] + t))
    if m == 10:
        assert all(r["date"] != day for r in d["prayer_times"])
        d["prayer_times"].append(row)
    else:
        nov.append(row)
save(p, d, o)
novp = ROOT / "nl/rotterdam/essalam-mosque/november.json"
assert not novp.exists()
novp.write_text(json.dumps({"month": "NOVEMBER", "prayer_times": nov, "iqamah_times": [], "jummah_iqamah": ""}, indent=2) + "\n")
print("done")
