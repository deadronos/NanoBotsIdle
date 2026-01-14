# PR D — Add generic `PriorityQueue` & replace MeshingScheduler heap

**Goal:** Introduce a well-tested `src/meshing/priorityQueue.ts` generic min-heap and replace the inlined heap implementation in `MeshingScheduler` with it.

**Acceptance criteria:**
- `PriorityQueue` implementation with stable ordering and tests.
- Replace heap helpers in `MeshingScheduler` with the new queue in small, incremental steps.
- Add unit tests that confirm scheduler behavior still matches expectations and no regression in job ordering/retry.

**Labels:** `area/meshing`, `size/M`
