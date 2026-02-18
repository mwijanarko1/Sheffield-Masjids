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
