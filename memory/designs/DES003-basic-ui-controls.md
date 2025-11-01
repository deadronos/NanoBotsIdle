# DES003 - Basic UI & Controls

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #3

## Motivation / Summary
Polish and complete all UI panels for building placement, monitoring, and game control. This revision adds a free-placement ghost, a visual queue for pending placements, and an intuitive click/right-click interaction model:

- Left-click in BuildPanel starts free-placement for the selected building type.
- While in placement mode, moving the mouse moves a ghost building that snaps to integer grid cells.
- Left-click on the canvas confirms placement (attempts to build immediately if resources permit; otherwise enqueues as a ghost in the visual queue).
- Right-click on a queued ghost removes it from the queue (visual only).

This design keeps simulation-side placement logic separated (world-level spawn helpers) while using the existing `uiSnapshotSystem` (throttled at 10Hz) for efficient UI updates.

## Requirements (EARS-style)
- WHEN the game state updates, THE UI SHALL display live values for heat/power/throughput in the TopBar [Acceptance: TopBar shows live data]
- WHEN player selects a building, THE UI SHALL show building details and allow placement [Acceptance: selected buildings show details]
- WHEN placing buildings, THE UI SHALL offer a ghost placement mode and queuing with the following interactions: free-placement ghost that snaps to grid, left-click to confirm/attempt build (falling back to queue), and right-click to remove queued ghost [Acceptance: ghost building placed or queued; queued ghosts removable]

## High-level design

- Components involved (files, modules)
  - `src/ui/panels/TopBar.tsx`, `BuildPanel.tsx`, `AIPanel.tsx`, `BottomBar.tsx`
  - `src/ui/simview/FactoryCanvas.tsx` (canvas mouse interaction, ghost rendering)
  - `src/state/store.ts`, `src/state/runSlice.ts`, `src/state/types.ts`, `src/state/actions.ts`
  - `src/ecs/world/createWorld.ts` (spawn helper) and `src/ecs/systems/uiSnapshotSystem.ts`

- Data flow / interactions
  - `uiSnapshotSystem` continues to produce lightweight snapshots (10Hz) consumed by React via Zustand to minimize re-renders.
  - Placement actions originate in UI (BuildPanel & FactoryCanvas) and call Zustand run-slice actions (`startPlacement`, `cancelPlacement`, `confirmPlacementAt`, `queueGhostBuilding`, `placeBuilding`).
  - On successful placement the world is mutated via a canonical `spawnBuildingAt(world, type, x, y)` helper.
  - The run slice keeps a `ghostQueue` (visual-only queue) and a small `placementMode` state describing the current free-placement ghost.

- Key algorithms or constraints
  - Ghost snapping: mouse coordinates convert to world-space then snap to integer grid positions before rendering.
  - Resource check: `placeBuilding` attempts an immediate placement by validating resource availability and build constraints in the world; if it fails due to resource/space, the UI will enqueue a visual ghost.
  - Throttle: `uiSnapshotSystem` runs at ~10Hz already; ensure placement UI remains responsive by using local mousemove state for the ghost (don’t rely on snapshot for live mouse position).

## Acceptance Criteria
- All panels display live data from `uiSnapshot`.
- Users can start free-placement via the BuildPanel and move a ghost on the FactoryCanvas.
- Left-click on the FactoryCanvas attempts to place immediately; if placement is not possible, a queued ghost is added to the visual queue.
- Right-click on a queued ghost removes it from the queue.
- Selected buildings (click on placed building) show details via existing `selectedEntity` in the state.

## Implementation tasks (high level)

- [ ] Define placement state shape in `src/state/types.ts` (`PlacementState`, `GhostEntry`) and extend `RunSlice` with placement methods.
- [ ] Implement placement and queue methods in `src/state/runSlice.ts` (`startPlacement`, `cancelPlacement`, `confirmPlacementAt`, `queueGhostBuilding`, `placeBuilding`).
- [ ] Add a `spawnBuildingAt(world, type, x, y): EntityId` helper in `src/ecs/world/createWorld.ts` (exported) used by `placeBuilding`.
- [ ] Wire `BuildPanel.tsx` to call `startPlacement(type)` and offer a small queue toggle / guidance UI (e.g., hint: "Left-click to place, Right-click to remove queued ghost").
- [ ] Update `FactoryCanvas.tsx` to render the current placement ghost (local mouse-tracked) and the `ghostQueue` entries; implement SVG mouse handlers that convert client coordinates to world coords and map to snapped grid positions.
- [ ] Implement unit tests for `spawnBuildingAt` and `placeBuilding`, and an integration test that simulates clicking BuildPanel → FactoryCanvas to confirm behavior.
- [ ] Update documentation (`memory/tasks/TASK003-basic-ui-controls.md`) and memory index files.

## Notes / Risks

- Tight coupling remains between the `UISnapshot` shape and UI components; add lightweight adapters if the snapshot changes frequently.
- The queue in this design is visual-only (no scheduling or auto-spawn). If an auto-spawn schedule is required later, expand the run-slice and world logic.
- Performance: rendering many queued ghosts could hurt canvas performance. Limit visual queue length or collapse identical queued entries into a stacked count marker.

## UX Flow (quick)

1. Player clicks "Extractor" in `BuildPanel` → `startPlacement('extractor')` called.
2. FactoryCanvas enters placement-mode: local mousemove updates ghost position snapped to grid; the ghost is rendered semi-transparently.
3. Player left-clicks on canvas:
   - If `placeBuilding` succeeds (resources & space OK) the building is spawned immediately and appears in `uiSnapshot` on the next snapshot publish.
   - If `placeBuilding` fails due to resources/space, call `queueGhostBuilding(type,x,y)` which appends a visual-only ghost entry to `ghostQueue`.
4. Player can right-click a queued ghost to remove it from `ghostQueue`.

## Future enhancements

- Allow queued ghosts to automatically attempt placement when resources become available (scheduling).
- Add keyboard shortcuts for cancel/confirm placement and quick-rotate where applicable.

