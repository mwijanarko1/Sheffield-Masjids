# Design: Persist Mosque Choice

## Overview
The user wants to persist their mosque selection in browser storage (`localStorage`) so that it remains selected even after a page refresh on the home page.

## Proposed Changes
### 1. New Custom Hook: `src/hooks/use-persisted-mosque.ts`
- **Purpose**: Manage the mosque selection state and handle `localStorage` persistence.
- **Logic**:
    - Use `useState` for the current mosque.
    - Initial value: the first mosque in the list (as currently).
    - `useEffect` (on mount): Load the mosque ID from `localStorage`. If found, find the corresponding mosque object and update the state.
    - `useEffect` (on state change): Save the selected mosque ID to `localStorage`.
- **Reasoning**: This provides a clean separation of concerns and keeps the `HomeContent` component simpler.

### 2. Update `HomeContent` component
- **Location**: `src/components/HomeContent.tsx`
- **Changes**:
    - Import and use the `usePersistedMosque` hook instead of `useState`.
    - Pass `mosques` to the hook.

## Architecture & Data Flow
1. `HomeContent` calls `usePersistedMosque(mosques)`.
2. `usePersistedMosque` initializes with `mosques[0]`.
3. After the first render, `usePersistedMosque`'s `useEffect` checks `localStorage`.
4. If a stored ID is found, it updates the state to the corresponding mosque.
5. When the user changes the selection, `setSelectedMosque` updates the state, and a separate `useEffect` saves the new ID to `localStorage`.

## Testing Plan
1. **Manual Testing**:
    - Select a mosque on the home page.
    - Refresh the page.
    - Verify that the selection is preserved.
    - Verify that the map and prayer times widget update accordingly.
    - Check `localStorage` in the browser dev tools to ensure the correct ID is stored.

## Alternatives Considered
- **Inline `useEffect` in `HomeContent.tsx`**: Simpler for a one-off, but less clean and less reusable.
- **URL Parameter**: Useful for sharing links, but the user specifically asked for browser storage.
