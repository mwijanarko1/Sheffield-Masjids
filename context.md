# Code Context — Convex API Surface & Extract Skill

## Files Retrieved

1. **`convex/schema.ts`** (lines 1–96) — Schema defining 5 tables: `cities`, `mosques`, `monthlyPrayerTimes`, `ramadanTimetables`, `ukDstCalendar` with indexes.
2. **`convex/mosques.js`** (lines 1–196) — Query-only `list`, `listByCity`, `listCities`; mutations `upsert`, `upsertCity`, `removeBySlug`. No auth guards anywhere.
3. **`convex/prayerTimes.ts`** (lines 1–140) — Read-only queries: `getMonthly`, `getRamadan`, `getUkDstDates`. Has input validation (slug regex, month whitelist, year range 2000–2100). Still no auth.
4. **`convex/seed.ts`** (lines 1–132) — Mutations `seedMonthly`, `seedRamadan`, `seedUkDstCalendar`. Idempotent (upsert pattern). No auth.
5. **`convex/_generated/api.d.ts`** (lines 1–53) — Auto-generated API barrel for 3 modules: `mosques`, `prayerTimes`, `seed`.
6. **`scripts/seed-convex.ts`** (lines 1–420+) — Main seed orchestrator. Uses `ConvexHttpClient` to call `client.mutation(api.seed.seedMonthly, ...)` etc. Supports `--changed`, `--slug`, `--months`, `--prod`. Rate-limits itself with `await delay(200)` between mutations. Dev always force-unhides mosques.
7. **`src/lib/prayer-times.ts`** (lines 1–1781) — Client-side loader. Uses `ConvexHttpClient` to call `api.prayerTimes.getMonthly`, `api.prayerTimes.getRamadan`, `api.prayerTimes.getUkDstDates` via `client.query()`. Falls back to static JSON files. Has LRU caches, retry logic, 6s timeout.
8. **`src/lib/mosques.ts`** (lines 1–145) — Server-only loader. Calls `api.mosques.list` via `ConvexHttpClient`. Falls back to `public/data/mosques.json`. 60s TTL cache.
9. **`.env.local`** — Two Convex deployment URLs exposed: dev `upbeat-goat-583.eu-west-1.convex.cloud`, prod `zany-mockingbird-207.eu-west-1.convex.cloud`.
10. **`/Users/mikhail/.agents/skills/extract-mosque-prayer-times/SKILL.md`** (full) — Extraction skill covering Google Sheets CSV, WordPress plugin, MasjidBox API (with full-year iteration pattern), Next.js+Sheets pattern. Output format, registry rules, seeding commands, DST/solstice edge-cases.
11. **`public/data/mosques.json`** (lines 1–40+) — Registry of ~70+ mosques with lat/lng, city, `isHidden` flag.

## Key Code

### Exposed Convex Endpoints

```typescript
// Queries (read-only, any client with URL can call):
api.mosques.list({})                          → Mosque[]
api.mosques.listByCity({ citySlug })          → Mosque[]
api.mosques.listCities({})                    → City[]
api.prayerTimes.getMonthly({ mosqueSlug, month, year? }) → MonthlyPrayerTimes | null
api.prayerTimes.getRamadan({ mosqueSlug, date? }) → RamadanData | null
api.prayerTimes.getUkDstDates({})             → { uk_dst_dates: ... } | null

// Mutations (no auth — anyone with Convex URL can call):
api.mosques.upsert({ ...mosque })             → upserts mosque by slug
api.mosques.upsertCity({ ...city })           → upserts city
api.mosques.removeBySlug({ slug })            → deletes mosque
api.seed.seedMonthly({ mosqueSlug, month, year, ... }) → upserts monthly data
api.seed.seedRamadan({ mosqueSlug, gregorianStart, ... }) → upserts Ramadan data
api.seed.seedUkDstCalendar({ ukDstDates })    → upserts DST calendar
```

### Seed Script → Convex Bridge

```typescript
// scripts/seed-convex.ts (lines ~200-300)
const client = new ConvexHttpClient(convexUrl);
await client.mutation(api.seed.seedMonthly, { mosqueSlug, month, year, ... });
// 200ms delay between mutations — self-imposed rate limit, not Convex-enforced
```

### Client-Side Convex Usage

```typescript
// src/lib/prayer-times.ts (lines 162-185)
const client = new ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL);
const data = await client.query(api.prayerTimes.getMonthly, { mosqueSlug, month, year });
// Falls back to static JSON files in public/data/mosques/
```

### Skill Extraction Patterns (SKILL.md)

```markdown
- MasjidBox API: iterate 7-day chunks, API key from JS bundle, header `apikey: <key>`
- Google Sheets: published CSV URLs with `2PACX-` IDs
- WordPress plugin: `admin-ajax.php?action=…`, REST `wp-json/dpt/v1/…`
- HTML tables ALSO allowed (permitted source)
- OCR/images NOT allowed
- Full-year iteration required (12 months × 28-31 days)
```

## Architecture

```
[Extraction Scripts] → public/data/mosques/gb/{city}/{slug}/{month}.json
                              ↓
                    public/data/mosques.json (registry)
                              ↓
                    scripts/seed-convex.ts (node-side ConvexHttpClient)
                     ↙                    ↘
            convex.dev URL           convex.prod URL
         (upbeat-goat-583)      (zany-mockingbird-207)
                     ↓                    ↓
              Convex DB tables      Convex DB tables
              (isHidden forced      (isHidden respected)
               false for dev)
                     ↓
          [Next.js App] ← api.prayerTimes.get* (client queries)
          src/lib/prayer-times.ts  ← also falls back to static JSON
          src/lib/mosques.ts       ← also falls back to mosques.json
```

## Start Here

Open **`convex/mosques.js`** — it has both the publicly callable mutations (`upsert`, `removeBySlug`) AND the queries — all without auth, making it the highest-risk file.

## Spam / Abuse Risk Assessment

| Risk | Severity | Evidence |
|------|----------|----------|
| **Unauthenticated mutations** | 🔴 CRITICAL | `mosques.js:158` (`upsert` mutation, no `ctx.auth` check), `mosques.js:139` (`upsertCity`), `mosques.js:191` (`removeBySlug`), `seed.ts:31` (`seedMonthly`), `seed.ts:73` (`seedRamadan`), `seed.ts:131` (`seedUkDstCalendar`) |
| **Convex URLs exposed client-side** | 🔴 HIGH | `.env.local`: `NEXT_PUBLIC_CONVEX_URL` is public by convention (Next.js `NEXT_PUBLIC_` prefix). Embedded in client JS bundle. Both dev and prod URLs are known. |
| **No rate limiting** | 🟡 MEDIUM | `scripts/seed-convex.ts` has a self-imposed `delay(200)` but there's zero server-side rate limiting on any Convex function. |
| **No input size limits** | 🟡 MEDIUM | `seedMonthly` accepts `v.array(prayerTimeValidator)` with no max length — could insert 10,000+ entries per call. |
| **`removeBySlug` without confirmation** | 🟡 MEDIUM | `mosques.js:191-196` — any caller with the URL can delete any mosque by slug. No ownership check. |
| **Prod env URL same access model** | 🟡 MEDIUM | `CONVEX_PROD_URL` is a server-side env var in `.env.local`, but if leaked (e.g., CI logs), it gives full mutation access to prod data too. |

## Suggested Verification

1. Confirm whether Convex **deployment-level auth** (Convex dashboard → Auth) is configured — check `convex/auth.config.ts` (file does not exist; nothing found)
2. Verify `ctx.auth` is unused in all mutation handlers — grep confirms zero references
3. Check if `convex.json` exists in project root (not found — means no deployment-level auth config either)
4. Ask whether mutations should be restricted to admin-only (e.g., deploy key or server-side proxy)

## Recommended Specialist Implementer

A **backend/infra engineer** familiar with Convex auth middleware (`ctx.auth`), rate limiting via Convex scheduling or external API gateway, and who can add:
- Convex auth config (`convex/auth.config.ts`) with token-based access
- Migration of seed mutations behind a server-only proxy route
- Input size/rate validation in mutation handlers

## Needs Parent
Yes — this is a discovery-only pass. An implementer agent should be spawned after this context is reviewed.
