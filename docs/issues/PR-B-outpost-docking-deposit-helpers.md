# PR B — Consolidate outpost docking & deposit helpers

**Goal:** Extract shared docking logic, reroute thresholds, and deposit logic from `tickDrones` into `src/engine/outpostHelpers.ts`. Replace duplicated code paths for miners and haulers with helpers.

**Acceptance criteria:**
- New file `src/engine/outpostHelpers.ts` with clear helpers (e.g., `handleDockRequest`, `handleDeposit`) and constants for `QUEUE_THRESHOLD` and `REROUTE_COOLDOWN_MS`.
- Replace duplicated logic in `tickDrones.ts` to call these helpers.
- Unit tests covering queue/reroute behavior and deposit side-effects are added.
- Full test suite, lint and typecheck pass.

**Labels:** `area/engine`, `size/S`
