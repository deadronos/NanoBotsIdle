## Phase 1 Complete: Write failing bootstrap tests

Phase 1 added unit tests to detect the softlock scenario by asserting the default bootstrap produces at least one logistics drone (hauler) and that the explicit `spawnEntities:false` case still returns an empty shell.

**Files created/changed:**
- `src/ecs/world/createWorld.test.ts` — appended two Vitest tests to validate bootstrap behavior

**Functions created/changed:**
- None (tests only)

**Tests created/changed:**
- `createWorld() returns at least one hauler by default`
- `createWorld({ spawnEntities: false }) returns zero drones`

**Review Status:** APPROVED (code-review-subagent: tests well-formed; run with in-band flags to avoid worker timeouts)

**Git Commit Message:**
```
test: add createWorld bootstrap tests

- Add tests asserting default `createWorld()` yields at least one hauler.
- Add test asserting `createWorld({ spawnEntities: false })` yields zero drones.
- Adds failing tests to drive safety-check implementation to prevent softlocks on new runs and bad saves.
```

**Notes / Next Steps:**
- Implement a minimal safety-check (Option A) that ensures a newly created or loaded world has at least one hauler; call the helper from `createWorld` and `saveManager`.
- Add a CI-friendly test script: `"test:ci": "vitest --run --no-isolate --maxWorkers=1"` to avoid worker pool issues in constrained environments.
- Proceed to Phase 2 (implement safety-check) when ready.
