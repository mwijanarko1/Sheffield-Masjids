# Mawaqit.net Crawl and Comparison Plan

## Overview

Crawl prayer times from https://mawaqit.net/en/madina-masjid-sheffield-sheffield-s8-0zu-united-kingdom and compare against existing Madina Masjid Sheffield JSON files. Automatically update files if discrepancies are found.

## Current State

### Existing Data Structure

Location: `public/data/mosques/madina-masjid-sheffield/`

Files:
- `january.json` through `december.json` - Monthly prayer times
- `ramadan.json` - Special Ramadan timetable

Each file contains:
```json
{
  "month": "JANUARY",
  "prayer_times": [
    {
      "date": 1,
      "fajr": "06:11",
      "shurooq": "08:21",
      "dhuhr": "12:11",
      "asr": "13:43",
      "maghrib": "15:58",
      "isha": "18:01"
    }
    // ... more days
  ],
  "iqamah_times": [
    {
      "date_range": "1-31",
      "fajr": "10 mins after adhan",
      "dhuhr": "13:00",
      "asr": "Entry Time",
      "maghrib": "sunset",
      "isha": "15 mins after adhan"
    }
  ],
  "jummah_iqamah": "13:00"
}
```

### Current Generation Method

The existing script `scripts/fetch-madina-masjid-timetable.ts` uses:
- **Library**: `adhan` npm package
- **Calculation Method**: Muslim World League
- **Coordinates**: 53.361, -1.484 (Madina Masjid Sheffield)
- **Note**: Comment states "Mawaqit uses the same calculation methods"

## Implementation Plan

### Phase 1: Investigate Mawaqit Data Access

**Option A: API Access (Preferred)**
- Mawaqit may have an API endpoint for prayer times
- Check for public API documentation or reverse-engineer from network requests
- API would provide structured JSON data - easier to parse

**Option B: HTML Scraping**
- Parse HTML page directly
- Extract prayer times from DOM elements
- More brittle but works if no API available

### Phase 2: Create Crawl Script

Create `scripts/fetch-mawaqit-madina-masjid.ts`:

```typescript
// Pseudocode structure
interface MawaqitPrayerTime {
  date: string;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

async function fetchMawaqitTimes(): Promise<MawaqitPrayerTime[]> {
  // 1. Try API endpoint first
  // 2. Fall back to HTML scraping if needed
  // 3. Return structured prayer times
}
```

### Phase 3: Comparison Logic

```typescript
interface Discrepancy {
  date: string;
  prayer: string; // fajr, dhuhr, etc.
  localValue: string;
  mawaqitValue: string;
  difference: number; // minutes difference
}

function comparePrayerTimes(
  localData: PrayerTime[],
  mawaqitData: MawaqitPrayerTime[]
): Discrepancy[] {
  // Compare each day and prayer time
  // Return list of discrepancies
}
```

### Phase 4: Update Logic

```typescript
function updateJsonFiles(
  discrepancies: Discrepancy[],
  mawaqitData: MawaqitPrayerTime[]
): void {
  // 1. Load existing JSON files
  // 2. Update values that differ
  // 3. Write back to files
  // 4. Log all changes made
}
```

## Technical Considerations

### Mawaqit Website Analysis

The URL pattern suggests:
- `/en/` - English language
- `madina-masjid-sheffield-sheffield-s8-0zu-united-kingdom` - Mosque slug/identifier

Potential API endpoints to investigate:
- `https://mawaqit.net/api/mosque/{id}/prayer-times`
- `https://mawaqit.net/en/madina-masjid-sheffield-sheffield-s8-0zu-united-kingdom.json`

### Tolerance Threshold

- Prayer times may differ by 1-2 minutes due to rounding
- Consider a tolerance threshold (e.g., 2 minutes) before flagging as discrepancy
- Iqamah times are more likely to differ as they are set by the mosque

### Data to Compare

1. **Adhan Times** (Call to Prayer)
   - Fajr, Sunrise (Shurooq), Dhuhr, Asr, Maghrib, Isha
   - These should match closely if using same calculation method

2. **Iqamah Times** (Congregation Times)
   - Set by mosque administration
   - May change periodically
   - Important to keep updated

3. **Jummah Time**
   - Friday congregation time
   - May vary

## Execution Steps

1. **Create crawl script** - Fetch data from mawaqit.net
2. **Run comparison** - Compare against local JSON files
3. **Generate report** - Show all discrepancies found
4. **Apply updates** - Automatically update JSON files
5. **Verify changes** - Confirm updates were applied correctly

## Output

- Console output showing comparison results
- Updated JSON files if discrepancies found
- Summary of changes made

## Dependencies

- `cheerio` or `jsdom` for HTML parsing (if scraping needed)
- `node-fetch` or native `fetch` for HTTP requests
- Existing `adhan` package for reference

## Risks

1. **Website changes**: Mawaqit may change their HTML structure
2. **Rate limiting**: May need to add delays between requests
3. **Data format differences**: Mawaqit may use different field names

## Next Steps

1. Investigate mawaqit.net for API availability
2. Create the crawl script
3. Run comparison and update process
