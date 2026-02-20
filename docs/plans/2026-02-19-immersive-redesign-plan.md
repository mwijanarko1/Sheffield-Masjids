# Immersive Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the entire UI to use a dynamic time-of-day gradient background, massive typography, and frosted glass components.

**Architecture:** 
- Extract theme logic to `PrayerTimesWidget.tsx` (it already knows the `upcomingPrayer` and `nextPrayer`).
- Pass the theme up to `HomeContent.tsx` or wrap the entire page background inside `PrayerTimesWidget.tsx`. Actually, the simplest architectural change is to have `PrayerTimesWidget` render a full-viewport fixed background `<div className="fixed inset-0 -z-10 transition-colors duration-1000 ...">` based on the `upcomingPrayer`.
- Refactor `LocationBanner` to use `bg-white/10 backdrop-blur-md text-white border-white/20`.
- Refactor `PrayerTimesWidget` to remove the solid `bg-primary` gradient and replace it with pure glass `bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl`.
- Refactor typography to be massive and clean.

**Tech Stack:** Next.js, React, Tailwind CSS

---

### Task 1: Create Dynamic Background

**Files:**
- Modify: `src/components/PrayerTimesWidget.tsx`

**Step 1: Add Theme Map & Background Element**
Create a mapping from `upcomingPrayer` (fajr, dhuhr, asr, maghrib, isha) to specific Tailwind gradient classes.
Examples:
- `fajr`: `from-slate-900 via-purple-900 to-slate-800`
- `sunrise`: `from-orange-400 via-rose-400 to-purple-500`
- `dhuhr`: `from-sky-400 via-blue-500 to-indigo-500`
- `asr`: `from-amber-500 via-orange-500 to-rose-500`
- `maghrib`: `from-violet-600 via-fuchsia-600 to-orange-500`
- `isha`: `from-slate-900 via-blue-900 to-slate-900`
- `jummah`: `from-emerald-500 via-teal-500 to-cyan-600`
- default: `from-slate-900 to-slate-800`

Add a `<div className="fixed inset-0 -z-10 bg-gradient-to-br transition-all duration-1000 [theme-classes]" />` at the top level of the component's return.

**Step 2: Commit**
`git add ... && git commit -m "feat: add dynamic time-of-day background gradients"`

---

### Task 2: Glassmorphism Overhaul for PrayerTimesWidget

**Files:**
- Modify: `src/components/PrayerTimesWidget.tsx`

**Step 1: Update Widget Container**
Change the main widget container from `bg-gradient-to-b from-[var(--theme-primary)] ...` to `bg-black/20 backdrop-blur-xl border border-white/20 shadow-2xl`. Make all text bright white.

**Step 2: Massive Typography & Selector**
Make the countdown timer `text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter`.
Make the Mosque Selector a sleek, transparent pill `bg-white/10 rounded-full border-white/20 text-white`.

**Step 3: Timetable Rows**
Update the row styling. The active row (`isUpcoming`) should be `bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white`. Inactive rows should have no background or very subtle `border-b border-white/10`.

**Step 4: Commit**
`git add ... && git commit -m "style: apply glassmorphism and massive typography to widget"`

---

### Task 3: Glassmorphism for LocationBanner & App Background

**Files:**
- Modify: `src/components/LocationBanner.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Update LocationBanner**
Change `bg-muted border-border text-sm` to `bg-black/20 backdrop-blur-md border-b border-white/10 text-white text-sm shadow-lg`. Make buttons use `variant="secondary"` or `bg-white/20 hover:bg-white/30 text-white border-0`.

**Step 2: Update App Background**
In `src/app/page.tsx`, remove `bg-background` and make it transparent so the fixed background from the widget shows through. Wait, if `PrayerTimesWidget` is not on every page, maybe the background belongs in `HomeContent`. Let's just remove `bg-background` from `src/app/page.tsx`'s main tag.

**Step 3: Commit**
`git add ... && git commit -m "style: apply glassmorphism to location banner and layout"`

---

### Task 4: Verify & Polish

**Files:**
- All modified files

**Step 1: Run dev server and check visual polish**
Use browser subagent to take screenshots.
Ensure text contrast is good (using `text-white` with `drop-shadow-sm` if needed).
Ensure the `CustomSelect` looks good on dark backgrounds.
