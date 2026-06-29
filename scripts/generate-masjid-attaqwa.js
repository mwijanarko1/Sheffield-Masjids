const adhan = require('adhan');
const fs = require('fs');
const path = require('path');

const LAT = 29.6652862;
const LNG = -95.6157653;
const TZ = 'America/Chicago';
const YEAR = 2026;

const coords = new adhan.Coordinates(LAT, LNG);
const params = adhan.CalculationMethod.MuslimWorldLeague();

// Iqamah schedule from user (date -> {fajr, dhuhr, asr, isha} in 24h HH:MM)
const iqamahSchedule = [
  { date: '2026-01-01', fajr: '06:30', dhuhr: '14:00', asr: '16:15', isha: '19:30' },
  { date: '2026-02-01', fajr: '06:15', dhuhr: '14:00', asr: '16:30', isha: '19:30' },
  { date: '2026-02-15', fajr: '06:15', dhuhr: '14:00', asr: '16:45', isha: '20:15' },
  { date: '2026-03-01', fajr: '06:00', dhuhr: '14:00', asr: '16:45', isha: '20:15' },
  { date: '2026-03-08', fajr: '07:00', dhuhr: '14:00', asr: '18:00', isha: '21:15' },
  { date: '2026-03-13', fajr: '06:45', dhuhr: '14:00', asr: '18:00', isha: '21:00' },
  { date: '2026-04-01', fajr: '06:15', dhuhr: '14:00', asr: '18:00', isha: '21:15' },
  { date: '2026-04-15', fajr: '06:00', dhuhr: '14:00', asr: '18:00', isha: '21:30' },
  { date: '2026-05-01', fajr: '05:45', dhuhr: '14:00', asr: '18:00', isha: '21:30' },
  { date: '2026-05-15', fajr: '05:30', dhuhr: '14:00', asr: '18:00', isha: '21:45' },
  { date: '2026-06-01', fajr: '05:30', dhuhr: '14:00', asr: '18:00', isha: '22:00' },
  { date: '2026-07-01', fajr: '05:30', dhuhr: '14:00', asr: '18:15', isha: '22:00' },
  { date: '2026-07-15', fajr: '05:45', dhuhr: '14:00', asr: '18:15', isha: '21:50' },
  { date: '2026-08-01', fajr: '06:00', dhuhr: '14:00', asr: '18:15', isha: '21:40' },
  { date: '2026-08-15', fajr: '06:00', dhuhr: '14:00', asr: '18:00', isha: '21:30' },
  { date: '2026-09-01', fajr: '06:15', dhuhr: '14:00', asr: '18:00', isha: '21:00' },
  { date: '2026-09-15', fajr: '06:30', dhuhr: '14:00', asr: '17:45', isha: '20:45' },
  { date: '2026-10-01', fajr: '06:30', dhuhr: '14:00', asr: '17:30', isha: '20:30' },
  { date: '2026-10-15', fajr: '06:45', dhuhr: '14:00', asr: '17:15', isha: '20:15' },
  { date: '2026-11-08', fajr: '06:00', dhuhr: '14:00', asr: '16:15', isha: '19:30' },
  { date: '2026-12-01', fajr: '06:15', dhuhr: '14:00', asr: '16:15', isha: '19:30' },
];

function fmt24(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false });
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getIqamahForDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00-06:00');
  let best = iqamahSchedule[0];
  for (const entry of iqamahSchedule) {
    const entryDate = new Date(entry.date + 'T12:00:00-06:00');
    if (entryDate <= date) {
      best = entry;
    }
  }
  return best;
}

const months = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];
const monthNames = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const BASE_DIR = 'public/data/mosques/us/sugar-land/masjid-at-taqwa';
fs.mkdirSync(BASE_DIR, { recursive: true });

for (let m = 0; m < 12; m++) {
  const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
  const prayerTimes = [];
  const iqamahTimes = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(YEAR, m, d);
    const dateStr = `${YEAR}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Calculate adhan times
    const times = new adhan.PrayerTimes(coords, date, params);
    const fajr = fmt24(times.fajr);
    const shurooq = fmt24(times.sunrise);
    const dhuhr = fmt24(times.dhuhr);
    const asr = fmt24(times.asr);
    const maghrib = fmt24(times.maghrib);
    const isha = fmt24(times.isha);

    prayerTimes.push({
      date: d,
      fajr,
      shurooq,
      dhuhr,
      asr,
      maghrib,
      isha
    });

    // Get iqamah times
    const iq = getIqamahForDate(dateStr);
    const maghribIqamah = addMinutes(maghrib, 2);

    iqamahTimes.push({
      date_range: String(d),
      fajr: iq.fajr,
      dhuhr: iq.dhuhr,
      asr: iq.asr,
      maghrib: maghribIqamah,
      isha: iq.isha
    });
  }

  const monthData = {
    month: monthNames[m],
    prayer_times: prayerTimes,
    iqamah_times: iqamahTimes,
    jummah_iqamah: '14:00 / 15:00 / 16:00'
  };

  const filePath = path.join(BASE_DIR, `${months[m]}.json`);
  fs.writeFileSync(filePath, JSON.stringify(monthData, null, 2));
  console.log(`Written: ${filePath}`);
}

// Verify by reading a few entries
console.log('\n=== Verification ===');
const sample = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'june.json')));
console.log('June entries:', sample.prayer_times.length);
console.log('First:', JSON.stringify(sample.prayer_times[0]));
console.log('Iqamah first:', JSON.stringify(sample.iqamah_times[0]));
console.log('June 15:', JSON.stringify(sample.prayer_times[14]));
console.log('Iqamah June 15:', JSON.stringify(sample.iqamah_times[14]));
console.log('Jummah:', sample.jummah_iqamah);

const jan = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'january.json')));
console.log('\nJan 1:', JSON.stringify(jan.prayer_times[0]));
console.log('Iqamah Jan 1:', JSON.stringify(jan.iqamah_times[0]));

const dec = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'december.json')));
console.log('\nDec 25:', JSON.stringify(dec.prayer_times[24]));
console.log('Iqamah Dec 25:', JSON.stringify(dec.iqamah_times[24]));
