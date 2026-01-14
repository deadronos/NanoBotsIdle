# PR E — Extract mesh utilities from `useMeshedChunks`

**Goal:** Move `buildBufferGeometry`, mesh manager logic (apply/dispose/pending), and scheduler factory from `useMeshedChunks` into smaller modules under `src/components/world/mesh` or `src/meshing`.

**Acceptance criteria:**
- `buildBufferGeometry` extracted and unit-tested.
- Mesh manager (applyMeshResult, disposeLodGeometries) extracted and tested.
- Scheduler creation moved to a factory function to isolate worker wiring.
- `useMeshedChunks` reduced in size and imports these helpers; integration tests preserved.

**Labels:** `area/meshing`, `size/M`
