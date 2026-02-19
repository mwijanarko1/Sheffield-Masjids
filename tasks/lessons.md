# Lessons

## 2026-02-17

- Correction pattern: User requested a specific interaction flow, but the prior pass emphasized visual styling over the exact flow.
- Rule: When the user defines sequence-driven UX ("first A, then B"), implement that flow literally before aesthetic enhancements.
- Rule: For redesign requests, always map requested actions to explicit UI states/transitions (hidden, reveal, toggle, route) and verify each state exists in code.
- Correction pattern: User requested adopting a specific external repository theme, but implementation used a custom palette first.
- Rule: When user names a source repository/style, inspect its real tokens and port those values directly before making further visual tweaks.
- Correction pattern: User explicitly requested shadcn, but implementation initially relied on custom primitives/classes.
- Rule: When a design system is explicitly requested, validate against the official docs first and implement with that system’s component API/structure.

## 2026-02-18

- Correction pattern: User provided a strong visual reference and explicit color rejection ("no green"), but prior pass kept a mixed palette.
- Rule: When a user references a target mock and rejects a color family, perform a hard palette sweep across globals + component gradients and remove all conflicting tones in one pass.
- Correction pattern: User requested placement of a CTA within a specific component section, but prior pass placed it in a nearby parent layout.
- Rule: When user specifies exact placement ("in X component, after Y element"), implement location literally and avoid equivalent-but-different placement in parent containers.
- Correction pattern: User requested an additional timing to appear in a specific sequence position, but prior pass did not add it to the core rendered row list.
- Rule: When user requests timing order changes ("show X under Y"), implement it by updating the underlying ordered timings array so render order is guaranteed.
- Correction pattern: User requested visual highlighting only, but prior pass added extra label text ("Today") that was not requested.
- Rule: For UI requests phrased as style-only ("highlight"), avoid adding new visible copy/labels unless explicitly asked.
- Correction pattern: Convex deployment failed because schema used reserved index name `by_id`.
- Rule: Before adding Convex indexes, validate names against reserved keywords (`by_id`, `by_creation_time`, `_` prefix disallowed) and use domain-specific names like `by_mosque_id`.
- Correction pattern: Copied Ramadan data while user intended only non-Ramadan yearly files to be synced.
- Rule: For scope-specific data sync requests, explicitly preserve excluded datasets (e.g., `ramadan.json`) and copy only named file groups.

## 2026-02-19

- Correction pattern: Frontend input validation was added, but equivalent backend validation on Convex queries was missing.
- Rule: When hardening any externally callable input, enforce the same validation rules in both frontend utility code and backend query/mutation handlers.
- Correction pattern: Cache limits were added, but access patterns still behaved as FIFO rather than true LRU.
- Rule: If eviction is Map-order based, always update entry order on cache hits so eviction semantics match intended LRU behavior.
- Correction pattern: Retry logic initially retried broad failures with linear delays.
- Rule: Retry only retriable status/error classes and use exponential backoff with jitter by default.

## 2026-02-19

- Correction pattern: Ramadan extraction used inferred/offset values and incorrect Gregorian alignment instead of literal timetable rows.
- Rule: When user provides a mosque timetable image, transcribe day-by-day values directly; do not infer missing offsets for columns that are explicitly provided.
- Rule: Validate Gregorian day progression against the real calendar (no impossible dates like `Feb 29` in non-leap years) and confirm Ramadan start/end boundaries before finalizing.
- Rule: For mosques that publish Jamaat-only schedules, preserve Jamaat semantics in extracted data and map `Fajr` adhan to `Sehri Ends` when explicitly stated.
- Correction pattern: User clarified that Ramadan tables may provide only partial adhan fields, with other adhan values expected from normal monthly timetables.
- Rule: When a Ramadan source omits specific adhan columns, backfill only those omitted adhan fields from the corresponding normal monthly files by exact Gregorian date mapping; keep provided Ramadan fields unchanged.
- Correction pattern: Persisted selector state restored correctly after refresh, but async widget fetches from the default initial mosque could still overwrite the restored mosque data.
- Rule: In client components that fetch on key state changes, guard async state writes with request IDs or cancellation so stale responses cannot win race conditions.
