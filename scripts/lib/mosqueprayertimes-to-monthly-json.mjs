/**
 * Convert mosqueprayertimes.org AJAX payloads to app monthly JSON
 * (`public/data/mosques/<slug>/april.json` shape).
 */

const MONTH_NAMES_EN = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** `5:14` → `05:14` for consistent JSON across tenants */
export function normalizeHHMM(t) {
  if (t == null || t === "") return "";
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** @param {string} s DD/MM/YYYY */
export function parseUkPrayerDate(s) {
  const p = String(s ?? "")
    .trim()
    .split("/");
  if (p.length !== 3) return null;
  const day = parseInt(p[0], 10);
  const month = parseInt(p[1], 10);
  const year = parseInt(p[2], 10);
  if (![day, month, year].every((n) => Number.isFinite(n))) return null;
  return { day, month, year };
}

function isFridayRow(r) {
  const d = String(r?.day ?? "").toLowerCase();
  return d === "fri" || d === "friday";
}

/**
 * The mosqueprayertimes.org DataTables payload can include two rows for the same
 * `prayer_date` around month/year boundaries (e.g. a blank template row plus the real
 * row). Prefer the row that actually has timetable cells filled in.
 */
function dedupeByPrayerDate(rows, scoreRow) {
  const m = new Map();
  for (const r of rows) {
    const key = String(r?.prayer_date ?? "").trim();
    if (!key) continue;
    const prev = m.get(key);
    if (!prev) {
      m.set(key, r);
      continue;
    }
    if (scoreRow(r) > scoreRow(prev)) m.set(key, r);
  }
  return [...m.values()];
}

function scoreAdhanRow(r) {
  let n = 0;
  for (const k of ["fajr", "sunrise", "dhuhur", "asr", "maghrib", "isha"]) {
    if (String(r[k] ?? "").trim()) n++;
  }
  return n;
}

function scoreIqamahRow(r) {
  let n = 0;
  for (const k of ["fajr_iqamah", "dhuhur_iqamah", "asr_iqamah", "maghrib_iqamah", "isha_iqamah"]) {
    if (String(r[k] ?? "").trim()) n++;
  }
  return n;
}

/** Some tenants return a blank first row (e.g. 1 Jan) — seed schema requires non-empty HH:MM. */
function isAdhanRowEmpty(pt) {
  const keys = ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"];
  return keys.every((k) => !normalizeHHMM(pt[k] ?? ""));
}

function fillAdhanEmptyDays(prayer_times) {
  const sorted = [...prayer_times].sort((a, b) => a.date - b.date);
  const keys = ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"];
  for (let i = 0; i < sorted.length; i++) {
    if (!isAdhanRowEmpty(sorted[i])) continue;
    const next = sorted[i + 1];
    const prev = sorted[i - 1];
    const donor =
      next && !isAdhanRowEmpty(next) ? next : prev && !isAdhanRowEmpty(prev) ? prev : null;
    if (!donor) continue;
    sorted[i] = {
      date: sorted[i].date,
      ...Object.fromEntries(keys.map((k) => [k, donor[k]])),
    };
  }
  return sorted;
}

function isIqamahDayEmpty(d) {
  const keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  return keys.every((k) => !normalizeHHMM(d[k] ?? ""));
}

function fillIqamahEmptyDays(sortedByDay) {
  const sorted = [...sortedByDay].sort((a, b) => a.day - b.day);
  const keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  for (let i = 0; i < sorted.length; i++) {
    if (!isIqamahDayEmpty(sorted[i])) continue;
    const next = sorted[i + 1];
    const prev = sorted[i - 1];
    const donor =
      next && !isIqamahDayEmpty(next) ? next : prev && !isIqamahDayEmpty(prev) ? prev : null;
    if (!donor) continue;
    sorted[i] = {
      day: sorted[i].day,
      ...Object.fromEntries(keys.map((k) => [k, donor[k]])),
    };
  }
  return sorted;
}

function pickJummahIqamah(adhanRows) {
  for (const r of adhanRows || []) {
    if (isFridayRow(r) && r.jumah_prayer && String(r.jumah_prayer).trim()) {
      return normalizeHHMM(String(r.jumah_prayer).trim());
    }
  }
  return "13:30";
}

/**
 * @param {object[]} adhanRows API `prayers-ajax-list` rows
 * @param {object[]} iqamahRows API `mosques-ajax-list` rows
 * @param {number} monthNum 1–12
 * @param {number} year e.g. 2026
 */
export function buildMonthlyMosqueJson(adhanRows, iqamahRows, monthNum, year) {
  const monthTitle = MONTH_NAMES_EN[monthNum - 1].toUpperCase();

  let adhan = [...(adhanRows || [])].filter((r) => {
    const p = parseUkPrayerDate(r.prayer_date);
    return p && p.month === monthNum && p.year === year;
  });
  adhan = dedupeByPrayerDate(adhan, scoreAdhanRow);
  adhan.sort((a, b) => parseUkPrayerDate(a.prayer_date).day - parseUkPrayerDate(b.prayer_date).day);

  let prayer_times = adhan.map((r) => {
    const p = parseUkPrayerDate(r.prayer_date);
    return {
      date: p.day,
      fajr: normalizeHHMM(r.fajr),
      shurooq: normalizeHHMM(r.sunrise),
      dhuhr: normalizeHHMM(r.dhuhur),
      asr: normalizeHHMM(r.asr),
      maghrib: normalizeHHMM(r.maghrib),
      isha: normalizeHHMM(r.isha),
    };
  });
  prayer_times = fillAdhanEmptyDays(prayer_times);

  const adhanByDate = new Map();
  for (const r of adhan) adhanByDate.set(r.prayer_date, r);

  let iqRows = [...(iqamahRows || [])].filter((r) => {
    const p = parseUkPrayerDate(r.prayer_date);
    return p && p.month === monthNum && p.year === year;
  });
  iqRows = dedupeByPrayerDate(iqRows, scoreIqamahRow);
  iqRows.sort((a, b) => parseUkPrayerDate(a.prayer_date).day - parseUkPrayerDate(b.prayer_date).day);

  if (iqRows.length === 0 && adhan.length > 0) {
    iqRows = adhan.map((r) => ({
      prayer_date: r.prayer_date,
      fajr_iqamah: r.fajr,
      dhuhur_iqamah: r.dhuhur,
      asr_iqamah: r.asr,
      maghrib_iqamah: r.maghrib,
      isha_iqamah: r.isha,
      day: r.day,
    }));
  }

  const daily = [];
  for (const iq of iqRows) {
    const p = parseUkPrayerDate(iq.prayer_date);
    const ad = adhanByDate.get(iq.prayer_date);
    const maghribIq =
      iq.maghrib_iqamah && String(iq.maghrib_iqamah).trim()
        ? iq.maghrib_iqamah
        : ad?.maghrib ?? "";
    daily.push({
      day: p.day,
      fajr: normalizeHHMM(iq.fajr_iqamah ?? ""),
      dhuhr: normalizeHHMM(iq.dhuhur_iqamah ?? ""),
      asr: normalizeHHMM(iq.asr_iqamah ?? ""),
      maghrib: normalizeHHMM(maghribIq),
      isha: normalizeHHMM(iq.isha_iqamah ?? ""),
    });
  }

  const iqamah_times = compressIqamahDaily(fillIqamahEmptyDays(daily));

  return {
    month: monthTitle,
    prayer_times,
    iqamah_times,
    jummah_iqamah: pickJummahIqamah(adhan),
  };
}

/**
 * Merge consecutive days with identical iqamah times into `date_range` "a-b" or "d".
 * @param {{day:number,fajr:string,dhuhr:string,asr:string,maghrib:string,isha:string}[]} sortedByDay
 */
function compressIqamahDaily(sortedByDay) {
  if (sortedByDay.length === 0) return [];

  const keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const sameTimes = (a, b) => keys.every((k) => a[k] === b[k]);

  const out = [];
  let start = sortedByDay[0].day;
  let end = sortedByDay[0].day;
  let bucket = { ...sortedByDay[0] };

  for (let i = 1; i < sortedByDay.length; i++) {
    const row = sortedByDay[i];
    const contiguous = row.day === end + 1;
    if (sameTimes(bucket, row) && contiguous) {
      end = row.day;
    } else {
      out.push(rangeEntry(start, end, bucket));
      start = end = row.day;
      bucket = { ...row };
    }
  }
  out.push(rangeEntry(start, end, bucket));
  return out;
}

function rangeEntry(start, end, times) {
  const date_range = start === end ? String(start) : `${start}-${end}`;
  return {
    date_range,
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export function monthFileName(monthNum) {
  return `${MONTH_NAMES_EN[monthNum - 1]}.json`;
}
