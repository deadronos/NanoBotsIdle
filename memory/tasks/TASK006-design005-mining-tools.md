# [TASK006] - Implement DESIGN005 Mining Tools + Progress

**Status:** Completed  
**Added:** 2025-12-23  
**Updated:** 2025-12-23

## Original Request

create a /memory/tasks implementation plan for DESIGN005 and execute that, use best practices

## Thought Process

- Use `memory/designs/DESIGN005-mining-tools.md` as the source of truth for requirements and sequencing.
- Preserve repo invariants (block IDs, per-frame rebuild caps, atlas tile IDs).
- Keep heavy objects out of Zustand; only store mining UI state and tool inventory summaries.
- Centralize mining math in a pure rules module for unit testing.
- Prefer minimal tool inventory changes that don't disrupt the existing block inventory/hotbar.

## Requirements (EARS)

1. WHEN the player mines a block, THE SYSTEM SHALL compute break time from block hardness and tool effectiveness, and require sustained mining until progress completes.  
   **Acceptance:** unit tests cover break-time calculations; in-game mining does not destroy blocks instantly.
2. WHEN a tool is used to mine, THE SYSTEM SHALL reduce durability by a configured amount and remove the tool at zero durability.  
   **Acceptance:** unit tests cover durability boundaries; tool state updates correctly in inventory.
3. WHEN mining is active, THE SYSTEM SHALL show a break-progress overlay and provide hit/break feedback (sound + particles).  
   **Acceptance:** manual check confirms visible progress ring and feedback events during mining.
4. WHEN a block is destroyed, THE SYSTEM SHALL resolve drops from a drop table (with tool gating) and add them to inventory.  
   **Acceptance:** unit tests cover drop resolution; mined ores yield configured drops.

## Design Notes

- Reference: `memory/designs/DESIGN005-mining-tools.md`.
- Introduce `src/voxel/mining.ts` for rules: `computeBreakTime`, `isToolEffective`, `resolveDrops`.
- Add `src/voxel/tools.ts` registry for tool tiers, efficiencies, and durability.
- Store tools in `useGameStore` as a small bag (separate from block inventory) with an equipped tool.
- Track mining session in `GameScene` and push progress into Zustand for UI.

## Error Matrix

| Scenario | Detection | Response | Notes |
| --- | --- | --- | --- |
| Block hardness missing or non-finite | `computeBreakTime` guard | Fall back to default hardness | Avoid NaN/Infinity in progress math |
| Tool ID missing from registry | Tool lookup returns undefined | Treat as bare hands | Keeps mining functional |
| Tool tier below requirement | `isToolEffective` returns false | Apply ineffective penalty; optionally suppress drops | Preserves progression without hard fail |
| Drop table has invalid ranges | Clamp min/max in resolver | Treat invalid entry as zero drops | Prevents crashes |

## Unit Testing Strategy

- Mining rules: `computeBreakTime`, `isToolEffective`, `resolveDrops` with deterministic RNG.
- Tool durability: verify degradation and removal at zero durability using pure helper logic.

## Implementation Plan

- Add tool registry + durability helpers (`src/voxel/tools.ts`) and integrate into store inventory.
- Extend block definitions with hardness, tool requirements, and drop tables.
- Implement mining rules module and unit tests.
- Update `GameScene` to track mining progress, consume tool durability, resolve drops, and trigger UI/audio/particles.
- Add UI overlays for mining progress and tool status; wire to store.
- Run targeted tests and update task status.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Create tool registry + durability helpers and store integration | Complete | 2025-12-23 | |
| 1.2 | Extend block defs with hardness/tool requirements/drop tables | Complete | 2025-12-23 | |
| 1.3 | Implement mining rules + unit tests | Complete | 2025-12-23 | |
| 1.4 | Add mining session handling in GameScene (progress/drops/durability) | Complete | 2025-12-23 | |
| 1.5 | Add UI feedback (progress ring, tool info, particles/sfx) | Complete | 2025-12-23 | |
| 1.6 | Run targeted tests and record results | Complete | 2025-12-23 | `npm test -- --run src/voxel/mining.test.ts src/voxel/tools.test.ts` |

## Progress Log

### 2025-12-23

- Created TASK006 with requirements, plan, and initial subtasks.
- Implemented tool registry + durability helpers and added tool inventory + equip flow in Zustand/UI.
- Added mining rules, block hardness/tool requirements/drop tables, and progress tracking with audio/particles.
- Integrated mining session handling in `GameScene` with break timing, drop resolution, and durability usage.
- Resolved drops directly into inventory (auto-pickup) to keep scope minimal; world item rendering deferred.
- Ran `npm test -- --run src/voxel/mining.test.ts src/voxel/tools.test.ts`.
