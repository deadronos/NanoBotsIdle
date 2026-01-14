# PR G — Extract FrontierManager and OutpostManager from `WorldModel`

**Goal:** Move frontier detection (addFrontierColumn, ensureFrontierInChunk) and outpost/docking logic into `FrontierManager` and `OutpostManager` to simplify `WorldModel` and make each responsibility more testable.

**Acceptance criteria:**
- New managers implemented with unit tests for frontier detection and outpost behavior.
- `WorldModel` refactored to compose and delegate to the managers.
- Integration tests verify the `WorldModel` behavior is preserved.

**Labels:** `area/world`, `size/L`
