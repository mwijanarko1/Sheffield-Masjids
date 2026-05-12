# Public Prayer Times API Design

## Summary

Build a read-only `v1` API for other websites to consume Sheffield mosque prayer times.

Chosen defaults:
- Access model: **hybrid**
- CORS: **allow all origins**
- First-version scope: **mosque list, daily prayer times, current/next prayer, monthly timetables**
- Implementation mode: **`/serious`**, because this is a public API surface
- Data source: reuse existing server-side data layer in `src/lib/mosques.ts` and `src/lib/prayer-times.ts`; do not expose Convex directly

The API should be stable, cacheable, safe for browser widgets, and rate-limited enough to avoid accidental abuse.

## Proposed Endpoints

### `GET /api/v1`

Purpose: API index and lightweight documentation metadata.

Response:
```json
{
  "version": "1",
  "timezone": "Europe/London",
  "endpoints": {
    "mosques": "/api/v1/mosques",
    "dailyPrayerTimes": "/api/v1/mosques/{slug}/prayer-times/{date}",
    "todayPrayerTimes": "/api/v1/mosques/{slug}/prayer-times/today",
    "monthlyTimetable": "/api/v1/mosques/{slug}/timetable/{year}/{month}",
    "currentPrayer": "/api/v1/mosques/{slug}/current"
  },
  "attribution": "Powered by Sheffield Masjids",
  "terms": "/terms"
}
```

### `GET /api/v1/mosques`

Purpose: list public mosques that can be queried.

Rules:
- Use `getMosques()` without `includeHidden`
- Do not expose hidden mosques
- Sort order should match existing `getMosques()` behavior

Response:
```json
{
  "data": [
    {
      "id": "madina-masjid-sheffield",
      "slug": "madina-masjid-sheffield",
      "name": "Madina Masjid Sheffield",
      "address": "...",
      "coordinates": {
        "lat": 53.0,
        "lng": -1.0
      },
      "website": "https://..."
    }
  ],
  "meta": {
    "count": 1,
    "timezone": "Europe/London"
  }
}
```

### `GET /api/v1/mosques/{slug}/prayer-times/today`

Purpose: simple widget endpoint for today’s adhan and iqamah times.

Rules:
- Interpret “today” in `Europe/London`
- Validate `{slug}` using the existing slug rules
- Return `404` if the mosque is unknown or hidden
- Use existing Ramadan override behavior automatically
- Use `getPrayerTimesForDate(slug, today)` and `getIqamahTimesForSpecificDateWithDstMapping(slug, today)`

Response:
```json
{
  "data": {
    "mosque": {
      "slug": "madina-masjid-sheffield",
      "name": "Madina Masjid Sheffield"
    },
    "date": "2026-05-03",
    "timezone": "Europe/London",
    "adhan": {
      "fajr": "04:10",
      "sunrise": "05:32",
      "dhuhr": "13:05",
      "asr": "17:12",
      "maghrib": "20:41",
      "isha": "22:05"
    },
    "iqamah": {
      "fajr": "04:30",
      "dhuhr": "13:30",
      "asr": "17:45",
      "maghrib": "sunset",
      "isha": "22:30",
      "jummah": "13:15"
    }
  },
  "meta": {
    "source": "sheffield-masjids",
    "lastUpdated": null
  }
}
```

### `GET /api/v1/mosques/{slug}/prayer-times/{date}`

Purpose: daily prayer times for a specific Gregorian date.

Path params:
- `date`: strict `YYYY-MM-DD`

Validation:
- Reject invalid dates with `400`
- Accept years `2000` through `2100`
- Interpret dates as Sheffield calendar dates, not UTC instants

Response shape: same as `/today`.

### `GET /api/v1/mosques/{slug}/current`

Purpose: compact endpoint for “current prayer” and “next prayer” widgets.

Rules:
- Use today’s prayer times in `Europe/London`
- Reuse existing current/upcoming prayer logic where possible
- If existing logic is client-only, extract a server-safe helper into `src/lib/prayer-status.ts`

Response:
```json
{
  "data": {
    "mosque": {
      "slug": "madina-masjid-sheffield",
      "name": "Madina Masjid Sheffield"
    },
    "date": "2026-05-03",
    "timezone": "Europe/London",
    "current": {
      "key": "asr",
      "label": "Asr",
      "time": "17:12"
    },
    "next": {
      "key": "maghrib",
      "label": "Maghrib",
      "time": "20:41"
    }
  }
}
```

### `GET /api/v1/mosques/{slug}/timetable/{year}/{month}`

Purpose: monthly timetable for timetable pages and heavier integrations.

Path params:
- `year`: integer `2000` through `2100`
- `month`: `1` through `12`

Rules:
- Validate mosque visibility
- Use `loadMonthlyPrayerTimes(slug, month, year)`
- Return existing normalized monthly data, but wrap it in API metadata
- Include both raw monthly ranges and expanded daily rows if needed by consumers

Recommended response:
```json
{
  "data": {
    "mosque": {
      "slug": "madina-masjid-sheffield",
      "name": "Madina Masjid Sheffield"
    },
    "year": 2026,
    "month": 5,
    "monthName": "MAY",
    "timezone": "Europe/London",
    "days": [
      {
        "date": "2026-05-01",
        "day": 1,
        "adhan": {
          "fajr": "04:14",
          "sunrise": "05:36",
          "dhuhr": "13:05",
          "asr": "17:10",
          "maghrib": "20:37",
          "isha": "22:01"
        }
      }
    ],
    "iqamahRanges": [
      {
        "dateRange": "1-10",
        "fajr": "04:45",
        "dhuhr": "13:30",
        "asr": "17:45",
        "maghrib": "sunset",
        "isha": "22:30",
        "jummah": "13:15"
      }
    ],
    "jummahIqamah": "13:15"
  }
}
```

## Error Contract

All errors should use one shape:

```json
{
  "error": {
    "code": "not_found",
    "message": "Mosque not found",
    "details": {}
  }
}
```

Codes:
- `bad_request`
- `not_found`
- `rate_limited`
- `internal_error`
- `service_unavailable`

Status mapping:
- `400`: invalid slug, date, year, month
- `404`: mosque not found, hidden mosque, timetable missing
- `405`: unsupported method
- `429`: rate limit exceeded
- `500`: unexpected failure
- `503`: upstream data source temporarily unavailable

## CORS

Apply to all `/api/v1/*` responses:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Authorization, X-API-Key, Content-Type
Vary: Origin
```

Do not allow mutating methods.

## Caching

Set response headers per endpoint:

### API index
```text
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400
```

### Mosque list
```text
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400
```

### Today and dated daily prayer times
```text
Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=3600
```

### Current prayer
```text
Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120
```

### Monthly timetable
```text
Cache-Control: public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400
```

Also add weak `ETag` support for successful JSON responses.

## Rate Limits

Use hybrid anonymous plus API-key limits.

Anonymous public traffic:
- Key: `ip`
- Limit: `120 requests/minute`
- Daily cap: `5,000 requests/day`
- Monthly timetable endpoint weight: `5`
- Other endpoints weight: `1`

API-key traffic:
- Key: API key id
- Limit: `600 requests/minute`
- Daily cap: `100,000 requests/day`
- Monthly timetable endpoint weight: `3`
- Other endpoints weight: `1`

Headers on every limited response:
```text
RateLimit-Limit: 120
RateLimit-Remaining: 117
RateLimit-Reset: 45
X-RateLimit-Policy: anonymous;w=60;q=120
```

On `429`:
```text
Retry-After: 45
```

Implementation default:
- Production: use Upstash Redis REST so it works on Netlify or Vercel without a long-lived process.
- Development/test fallback: in-memory limiter.
- Required production env vars:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Optional API key env:
  - `PRAYER_API_KEYS`
  - Format: JSON object keyed by key id, with SHA-256 key hashes and plan names.

Example:
```json
{
  "partner_abc": {
    "sha256": "hex_encoded_hash",
    "plan": "partner"
  }
}
```

Client sends either:
```text
X-API-Key: partner_abc.raw_secret
```

or:
```text
Authorization: Bearer partner_abc.raw_secret
```

The server splits key id from secret, hashes the secret, and compares it with the configured hash.

## Files To Add

Add shared API helpers:
- `src/lib/api/http.ts`
  - JSON response helper
  - CORS headers
  - method guard
  - cache headers
  - ETag helper
  - error response helper

- `src/lib/api/validation.ts`
  - slug validation
  - ISO date validation
  - year/month validation
  - API path param parsing

- `src/lib/api/rate-limit.ts`
  - anonymous and API-key identity resolution
  - Upstash Redis REST limiter
  - in-memory fallback for local/test
  - weighted endpoint limits

- `src/lib/api/auth.ts`
  - parse `X-API-Key` and `Authorization`
  - validate API key id/hash from `PRAYER_API_KEYS`
  - return anonymous identity when no key is present

- `src/lib/prayer-status.ts`
  - server-safe current/next prayer helper if existing UI logic cannot be reused cleanly

Add route files:
- `src/app/api/v1/route.ts`
- `src/app/api/v1/mosques/route.ts`
- `src/app/api/v1/mosques/[slug]/prayer-times/today/route.ts`
- `src/app/api/v1/mosques/[slug]/prayer-times/[date]/route.ts`
- `src/app/api/v1/mosques/[slug]/current/route.ts`
- `src/app/api/v1/mosques/[slug]/timetable/[year]/[month]/route.ts`

Add tests:
- `src/lib/api/validation.test.ts`
- `src/lib/api/auth.test.ts`
- `src/lib/api/rate-limit.test.ts`
- `src/app/api/v1/api-routes.test.ts`

Optional docs:
- `docs/public-api.md`

## Implementation Notes

- Keep all API routes server-only.
- Do not call Convex from browser clients for this public API.
- Reuse `getMosqueBySlug()` to enforce hidden-mosque behavior.
- Reuse `getPrayerTimesForDate()` and `getIqamahTimesForSpecificDateWithDstMapping()` for daily endpoints.
- Reuse `loadMonthlyPrayerTimes()` for monthly endpoint.
- Do not add a database migration for v1.
- Do not add dependency packages unless needed; Upstash REST can be called with native `fetch`.
- Do not change existing UI behavior.
- Do not alter current static JSON shape.
- Keep API response fields camelCase except where existing domain terms are clearer:
  - Use `adhan`
  - Use `iqamah`
  - Use `jummah`
  - Use `timezone`
  - Convert `shurooq` to public `sunrise`

## Security And Abuse Controls

- Strictly validate all route params before using them.
- Normalize slugs before lookups.
- Never allow path traversal into static JSON paths.
- Exclude hidden mosques from all public API responses.
- Avoid detailed internal errors in public responses.
- Include `X-Content-Type-Options: nosniff` on API responses.
- API keys must be hashed in env, never stored in plaintext.
- Rate limiting must run before expensive timetable loads.

## Test Cases

Validation:
- Reject malformed slugs such as `../x`, `Masjid`, empty string, and slugs over 64 chars.
- Reject invalid dates such as `2026-02-30`, `03-05-2026`, and years outside `2000..2100`.
- Reject invalid month values `0`, `13`, and non-integers.

Mosque endpoints:
- `GET /api/v1/mosques` returns public mosques only.
- Unknown mosque slug returns `404`.
- Hidden mosque slug returns `404`.

Daily prayer endpoints:
- `/today` uses Sheffield date.
- `/{date}` returns adhan and iqamah for a valid date.
- Ramadan dates use Ramadan timetable data when available.
- DST iqamah mapping matches existing app behavior.

Current endpoint:
- Before Fajr returns next `fajr`.
- Between prayers returns correct `current` and `next`.
- After Isha handles next-day Fajr clearly.

Monthly endpoint:
- Valid month returns normalized month data.
- Missing month data returns `404`.
- Monthly endpoint has heavier rate-limit weight.

CORS:
- `OPTIONS` returns correct CORS headers.
- `GET` includes `Access-Control-Allow-Origin: *`.

Rate limiting:
- Anonymous requests are limited by IP.
- API-key requests are limited by key id.
- Monthly endpoint consumes weighted quota.
- `429` includes `Retry-After`.
- Missing Upstash env uses in-memory fallback only outside production.

Caching:
- Successful responses include expected `Cache-Control`.
- Repeated identical response includes stable weak `ETag`.

## Verification Loop

Before production edits:
1. Run policy validator after choosing `/serious`:
   ```bash
   python3 ~/.agents/scripts/validate_agent_policy.py
   ```

TDD evidence:
1. Record RED before implementation:
   ```bash
   python3 ~/.agents/scripts/tdd_evidence.py record-red "public prayer API routes" "bun test src/lib/api/*.test.ts src/app/api/v1/*.test.ts"
   ```
2. Implement smallest passing API route/helper set.
3. Record GREEN:
   ```bash
   python3 ~/.agents/scripts/tdd_evidence.py record-green "public prayer API routes" "bun test src/lib/api/*.test.ts src/app/api/v1/*.test.ts"
   ```

Run:
```bash
bun test src/lib/api/*.test.ts src/app/api/v1/*.test.ts
bun test src/lib/*.test.ts
bun run build
```

Manual checks:
```bash
curl -i /api/v1
curl -i /api/v1/mosques
curl -i /api/v1/mosques/madina-masjid-sheffield/prayer-times/today
curl -i /api/v1/mosques/madina-masjid-sheffield/timetable/2026/5
```

## Explicit Assumptions

- Other websites need browser-callable JSON, not only server-to-server access.
- Public anonymous access is acceptable if endpoints remain read-only and rate-limited.
- Attribution can be handled through docs and response metadata rather than a hard technical requirement.
- Upstash Redis REST is acceptable for production rate limiting because the documented deployment target includes Netlify and the app should not rely on process-local memory.
- API v1 does not include write access, calendar ICS generation, Ramadan-only endpoints, webhooks, or mosque data administration.
