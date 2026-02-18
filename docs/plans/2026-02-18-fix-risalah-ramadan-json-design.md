# Design Doc: Fix Masjid Risalah Ramadan JSON 2026

## Overview
Update the `public/data/mosques/masjid-risalah/ramadan.json` file with correct adhan and iqamah times for Ramadan 2026 (Feb 18 - Mar 19).

## Data Changes

### 1. Adhan Times (`prayer_times`)
Sampled days from `february.json` and `march.json`:
- **Day 1 (Feb 18):** Fajr 05:27, Shurooq 07:15, Dhuhr 12:20, Asr 14:50, Maghrib 17:25, Isha 19:14
- **Day 10 (Feb 27):** Fajr 05:16, Shurooq 06:56, Dhuhr 12:19, Asr 15:03, Maghrib 17:43, Isha 19:24
- **Day 20 (Mar 9):** Fajr 05:00, Shurooq 06:32, Dhuhr 12:16, Asr 15:16, Maghrib 18:01, Isha 19:36
- **Day 30 (Mar 19):** Fajr 04:41, Shurooq 06:09, Dhuhr 12:14, Asr 15:28, Maghrib 18:20, Isha 19:48

### 2. Iqamah Times (`iqamah_times`)
Ranges based on user requirements:
- **Range 1-11 (Feb 18 - Feb 28):** Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:00
- **Range 12-21 (Mar 1 - Mar 10):** Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:15
- **Range 22-30 (Mar 11 - Mar 19):** Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:30

### 3. Other Settings
- **Jummah Iqamah:** 13:00
- **Taraweeh:** "Straight after Isha each night"

## Verification Plan
1. Check the `ramadan.json` file for correct JSON structure.
2. Verify that the `RamadanTimetable` component displays 30 days with the correct ranges.
