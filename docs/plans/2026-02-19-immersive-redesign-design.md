# Complete Immersive Redesign Design Document

**Date**: February 19, 2026  
**Topic**: Home Page Redesign - Immersive & Atmospheric

## Purpose & Goal
The previous dashboard design was deemed "too boring". The goal is to completely overhaul the visual architecture to be highly professional, immersive, and focused entirely on the prayer times. We will use a dynamic time-of-day gradient background and frosted glass (glassmorphism) UI elements to create a premium, native app-like experience.

## Architecture & Components

1. **Dynamic Background Wrapper (New Component / Hook)**
   - **Role**: A full-page (or hero section) animated gradient background that changes based on the next/current prayer (Fajr: dawn colors, Dhuhr: bright blue, Asr: warm orange, Maghrib: sunset pink/purple, Isha: deep night blue).
   - **Implementation**: We can create a helper function that returns specific Tailwind gradient classes based on the current/next prayer.

2. **LocationBanner (Glassmorphism Update)**
   - **Role**: Keep the same logic, but update styling to use `backdrop-blur-md bg-white/10 border-white/20 text-white` for a seamless glass look over the dynamic background.

3. **PrayerTimesWidget (Complete Overhaul)**
   - **Role**: The main immersive dashboard.
   - **Styling**: Will lose its solid background and instead become a completely transparent or heavily frosted glass container (`bg-white/10 backdrop-blur-xl border-white/20`).
   - **Hero Focus**: The Mosque Selector will be a sleek, centered pill button at the top. The Digital Clock and Next Prayer Countdown will be massive, using ultra-clean, heavy typography (e.g., `text-6xl font-black` or larger).
   - **Timetable**: The rows will be subtle and clean. The row for the *current* or *next* prayer will glow or have a highly contrasting solid background (like `bg-white/20` or a bright accent) to make it instantly visible.

4. **HomeContent & Layout**
   - **Mobile**: Full-screen immersive hero (Background covers the top half), glass cards stacking down.
   - **Desktop**: A very wide, cinematic layout. The dynamic gradient spans the entire background. The glass widget sits beautifully in the center or uses a 2-column layout (Main widget vs Map) as before, but unified by the single background theme.

## Data Flow
- `HomeContent` manages the selected mosque.
- `PrayerTimesWidget` receives the mosque and calculates the `nextPrayer`.
- A new state or derived value for `currentTheme` will be passed up to the wrapper, or the `PrayerTimesWidget` itself will render the full-screen dynamic background to ensure the theme matches the calculated prayer state perfectly.

## Error Handling
- Hydration is already fixed. We will ensure the dynamic background uses a safe default (e.g., a neutral subtle gradient) before hydration completes, then transitions smoothly.

## Testing
- Visual verification of all 5 prayer time gradients.
- Contrast check: Ensure the frosted glass and white text are readable against all 5 gradient themes.