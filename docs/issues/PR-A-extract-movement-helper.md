# PR A — Extract movement helper (moveTowards → movement.ts)

**Goal:** Move the `moveTowards` function from `src/engine/tickDrones.ts` into `src/engine/movement.ts` and expose a small, well-typed API.

**Acceptance criteria:**
- New helper file `src/engine/movement.ts` is added and exported.
- Unit tests added for `moveTowards` covering zero-distance, step clamping and typical motion.
- All usages in `src/engine/tickDrones.ts` are updated to use the new helper.
- Full test suite passes, lint and typecheck pass.

**Labels:** `area/engine`, `size/XS`
