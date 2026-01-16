# PR C — Split `tickDrones` into miner/hauler handlers

**Goal:** Extract `handleMinerState` and `handleHaulerState` functions (or equivalent) to simplify `tickDrones` and make state branches testable.

**Acceptance criteria:**
- `src/engine/tickDrones.handlers.ts` (or similar) introduced with the extracted state handlers.
- `tickDrones.ts` updated to call handlers, remaining small and readable.
- Unit tests added for each major state (SEEKING, MOVING, MINING, RETURNING, QUEUING, DEPOSITING, IDLE, FETCHING).
- All tests, lint, and typecheck pass.

**Labels:** `area/engine`, `size/M`
