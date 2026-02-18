# Fix Masjid Risalah Ramadan JSON Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update `public/data/mosques/masjid-risalah/ramadan.json` with accurate adhan and iqamah times for Ramadan 2026.

**Architecture:** Update the static JSON data source used by the `PrayerTimesWidget` and `RamadanTimetable` components.

**Tech Stack:** JSON, Next.js (static data).

---

### Task 1: Update `public/data/mosques/masjid-risalah/ramadan.json`

**Files:**
- Modify: `public/data/mosques/masjid-risalah/ramadan.json`

**Step 1: Write the updated JSON content**
Update `prayer_times` with samples from `february.json` and `march.json`:
- Day 1 (Feb 18): Fajr 05:27, Shurooq 07:15, Dhuhr 12:20, Asr 14:50, Maghrib 17:25, Isha 19:14
- Day 10 (Feb 27): Fajr 05:16, Shurooq 06:56, Dhuhr 12:19, Asr 15:03, Maghrib 17:43, Isha 19:24
- Day 20 (Mar 9): Fajr 05:00, Shurooq 06:32, Dhuhr 12:16, Asr 15:16, Maghrib 18:01, Isha 19:36
- Day 30 (Mar 19): Fajr 04:41, Shurooq 06:09, Dhuhr 12:14, Asr 15:28, Maghrib 18:20, Isha 19:48

Update `iqamah_times` with ranges:
- 1-11 (Feb 18 - Feb 28): Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:00
- 12-21 (Mar 1 - Mar 10): Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:15
- 22-30 (Mar 11 - Mar 19): Fajr: 15 mins after adhan, Dhuhr: 13:00, Asr: 15 mins after adhan, Isha: 20:30

Update `jummah_iqamah` to `13:00`.

**Step 2: Commit**
```bash
git add public/data/mosques/masjid-risalah/ramadan.json
git commit -m "fix: update Risalah Ramadan JSON with correct adhan and iqamah times"
```

### Task 2: Verify in UI
**Step 1: Run the development server**
Run: `npm run dev` (Wait for user)

**Step 2: Check the Ramadan timetable page**
Navigate to: `/mosques/masjid-risalah/ramadan-timetable`
Verify:
- 30 days are listed.
- Feb 18 - Feb 28 shows Isha at 8:00 PM.
- Mar 1 - Mar 10 shows Isha at 8:15 PM.
- Mar 11 - Mar 19 shows Isha at 8:30 PM.
- Fajr iqamah is 15 mins after adhan.
- Dhuhr and Jummah are at 1:00 PM.
