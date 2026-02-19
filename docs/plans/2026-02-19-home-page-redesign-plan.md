# Home Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the home page to an All-in-One Dashboard layout, extracting the location logic to a top banner, and merging the date/time and mosque selector into the main prayer widget.

**Architecture:** Create a `LocationBanner` component at the top. Refactor `PrayerTimesWidget` to include the date/time and dropdown. Use CSS Grid for a 2-column layout on desktop, stacking vertically on mobile.

**Tech Stack:** Next.js, React, Tailwind CSS, Shadcn UI

---

### Task 1: Create LocationBanner Component

**Files:**
- Create: `src/components/LocationBanner.tsx`
- Modify: `src/components/HomeHeaderCards.tsx` (to reference logic extraction)

**Step 1: Write the component**
Create `LocationBanner.tsx`. Copy the `useCallback(requestUserLocation)` and `useEffect` logic from `HomeHeaderCards.tsx`. Instead of rendering cards, render a full-width subtle banner if `closestMosque` is found. If no location access or error, return `null` or a button to "Enable Location for nearby Mosque".
Include a prop `onSelectMosque: (mosque: Mosque) => void` so clicking the closest mosque updates the parent state.

**Step 2: Commit**
```bash
git add src/components/LocationBanner.tsx
git commit -m "feat: create LocationBanner component"
```

---

### Task 2: Refactor PrayerTimesWidget to include Date/Time

**Files:**
- Modify: `src/components/PrayerTimesWidget.tsx`

**Step 1: Add Clock & Date Logic**
Move the `currentTime`, `hijriDate`, `gregorianDate`, and `timeString` logic from `HomeHeaderCards` into `PrayerTimesWidget`.
Update the widget's return JSX to add a Header section at the top, showing the Gregorian/Hijri date and the large digital clock (`timeString`).

**Step 2: Relocate the Mosque Selector**
The `showDropdown` logic is already in `PrayerTimesWidget`. Adjust its layout to sit directly below the newly added Date/Clock header.

**Step 3: Commit**
```bash
git add src/components/PrayerTimesWidget.tsx
git commit -m "refactor: integrate date, time, and selector into PrayerTimesWidget header"
```

---

### Task 3: Update HomeContent Layout

**Files:**
- Modify: `src/components/HomeContent.tsx`

**Step 1: Implement CSS Grid Layout**
Remove `<HomeHeaderCards mosques={mosques} />`.
Insert `<LocationBanner mosques={mosques} onSelectMosque={setSelectedMosque} />` at the very top of `HomeContent`.
Wrap `PrayerTimesWidget` and `MosqueMap` in a CSS grid container: `className="grid grid-cols-1 lg:grid-cols-3 gap-6"`.
Wrap `PrayerTimesWidget` in a `div` with `lg:col-span-2`.
Wrap `MosqueMap` section in a `div` with `lg:col-span-1`.

**Step 2: Commit**
```bash
git add src/components/HomeContent.tsx
git commit -m "feat: implement 2-column dashboard layout on home page"
```

---

### Task 4: Clean up unused code

**Files:**
- Delete: `src/components/HomeHeaderCards.tsx`

**Step 1: Remove the old file**
```bash
git rm src/components/HomeHeaderCards.tsx
git commit -m "refactor: remove deprecated HomeHeaderCards component"
```

---

### Task 5: Verify Responsive Design

**Files:**
- Modify: (Any Tailwind classes needing tweaks)

**Step 1: Manual Check**
Run `npm run dev` (if applicable) and visually verify the mobile stacking and desktop 2-column grid. Ensure the LocationBanner looks subtle and the clock ticks correctly inside the PrayerTimesWidget.
