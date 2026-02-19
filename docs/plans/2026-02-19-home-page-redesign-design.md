# Home Page Redesign Design Document

**Date**: February 19, 2026  
**Topic**: Home Page Redesign - All-in-One Dashboard  

## Purpose & Goal
The primary goal of this redesign is to improve the UX and layout of the home page by adopting a "dashboard style" layout. We want to consolidate the most important information (Date, Time, Mosque Selection, Next Prayer Countdown, and Timetable) into a cohesive widget and create a better split layout for desktop users.

## Architecture & Components

1. **LocationBanner (New Component)**
   - **Role**: Replaces the "Closest Masjid" logic from the existing `HomeHeaderCards`.
   - **Position**: At the very top of the home page.
   - **Functionality**: Uses geolocation. If a closer mosque is found, it will display a subtle, dismissible or clickable banner showing the distance and an action to select it.
   - **State**: Needs to manage user location permission and the calculated closest mosque.

2. **DashboardWidget (Refactored from PrayerTimesWidget)**
   - **Role**: The main hero component for the page, combining previously separate cards.
   - **Top Header**: Displays the current Gregorian and Hijri dates alongside a large, sleek digital clock.
   - **Selector**: The Mosque selection dropdown (`CustomSelect`) is embedded right below the date/time header.
   - **Hero Focus**: The large "Next Prayer Countdown" (Adhan or Iqamah).
   - **Timetable**: The 6-row table showing today's prayer times for the selected mosque.
   - **Footer**: The Jummah/Summer Schedule information blocks.
   - **Note**: The existing `HomeHeaderCards` component will essentially be deprecated, as its functionality is split between `LocationBanner` and the `DashboardWidget`.

3. **Layout Structure (src/app/page.tsx & HomeContent.tsx)**
   - **Mobile View**: Elements are stacked vertically.
     1. Location Banner (Top)
     2. Dashboard Widget (Middle)
     3. Mosque Map (Bottom)
   - **Desktop View**: We will implement a 2-column CSS Grid.
     - **Main Column (`col-span-2` or equivalent)**: Holds the Dashboard Widget, creating a primary focus area.
     - **Side Column (`col-span-1`)**: Holds the Mosque Map widget, creating a true "Command Center" feel where everything is visible above the fold without scrolling.

## Data Flow
- `HomeContent` will continue to pass the `mosques` list to child components.
- The `usePersistedMosque` hook will remain in `HomeContent` to manage the selected mosque state.
- `LocationBanner` will need a way to update the parent's `selectedMosque` state if the user clicks "Switch to closest mosque". We will pass a callback function (e.g., `onSelectMosque(mosque: Mosque)`) to it.

## Error Handling
- The `LocationBanner` will gracefully hide itself or show a neutral message if geolocation is denied or fails.
- Fallback states for the digital clock and dates while hydrating on the client to avoid hydration mismatch (e.g., return `null` or skeletons before mount).

## Testing
- Ensure the geolocation prompt works or fails gracefully across browsers.
- Verify that the layout reflows correctly from the 1-column mobile stack to the 2-column desktop grid.
- Ensure hydration mismatches do not occur with the live ticking clock inside the new `DashboardWidget`.