# DESIGN005 — Mining Mechanics: Block Hardness, Tools, Durability, and Mining Progress

**Status:** Proposed  
**Added:** 2025-12-23  
**Author:** GitHub Copilot

---

## Summary

Add mining mechanics that respect per-block hardness and provide tools with tiers, attributes, and durability. Introduce mining progress (break-time) and a break-progress UI with sounds and particle feedback so mining becomes a meaningful, progressive action rather than an instantaneous toggle.

## Motivation & Goals

- Make mining a meaningful gameplay loop (progression via better tools, durable equipment, resource sinks).
- Provide clean, testable rules for break time, tool effectiveness, and item durability.
- Keep the change minimal and compatible with the existing simple inventory/crafting system.

---

## Requirements (EARS-style)

1. WHEN a player attempts to mine a block, THE SYSTEM SHALL compute break time from block hardness and tool effectiveness, then require the player to hold/cycle mining action until progress completes.  
   **Acceptance:** Unit tests computing break-time for combinations of block/tool yield expected times; integration test confirms the player only receives drops once the progress reaches completion.

2. WHEN a tool is used to mine, THE SYSTEM SHALL reduce tool durability by a configured amount and destroy the tool at 0 durability.  
   **Acceptance:** Inventory state reflects durability decrease and eventual removal; tests for boundary cases (use at durability=1) pass.

3. WHEN mining, THE SYSTEM SHALL show a break-progress overlay, play appropriate sounds, and spawn break particles until block is destroyed.  
   **Acceptance:** UI integration test verifies overlay visibility and progress progression during mining.

4. WHEN a block is destroyed, THE SYSTEM SHALL drop configured items (drop table) and optionally respect future modifiers (e.g., fortune/silk-touch).  
   **Acceptance:** Drops match configured output (e.g., iron ore drops iron ore item) and are pickable.

---

## Data model & API changes

### Block changes

- Add `hardness?: number` to `BlockDef` (default: 1). Hardness is a positive float; higher is slower to dig.
- Optionally add a `dropTable?: DropEntry[]` to `BlockDef`.

```ts
type DropEntry = { itemId: string; min: number; max: number; chance?: number }; // flexible for later items
```

### Items & Tools

- Introduce a lightweight `Item` / `Tool` model (keep compatibility with `inventory` in `useGameStore`):

```ts
type ToolDef = {
  id: string; // example: 'pick_wood', 'pick_stone'
  toolType: 'pickaxe'|'axe'|'shovel'|'hand';
  tier: number;            // hand=0, wood=1, stone=2, ...
  efficiency: number;      // multiplier to reduce break-time
  durability: number;      // starting durability
}
```

Implementation options for inventory:

- Option A (recommended minimal): extend `useGameStore` with a second `items` bag (Record<string, {count, durability?}>) while keeping block counts as-is. This isolates block-count inventory from tool items and avoids large refactor.

### Mining flow API

- Add actions: `startMining(targetBlockCoord, selectedTool?)`, `stopMining()`. Track `miningProgress` (0..1) in PlayerController or ECS.
- When `miningProgress >= 1` remove block, spawn drops via `spawnItem(ecs, {itemId,...})`, and call `consumeDurability(tool, amount=1)`.

---

## UI & UX

- Break-progress overlay: a circular or ring progress drawn around the highlighted block (component addition in `src/ui/components`), updated at `statsTimer` frequency (e.g., frame/60Hz).
- Sounds: swing and hit loop during mining, final break sound.
- Particles: small shards on break (spawnParticle via ECS).

---

## Tests

- Break-time calculation unit tests for combinations of block.hardness and tool.efficiency.
- Integration test: player starts mining a block, holds action until break — ensure block removed and drop spawned.
- Tool durability tests: durability decreases per break and item removed at zero.

---

## Implementation plan (small steps)

1. **Block hardness** — Add `hardness` to `BlockDef` and set sane defaults for existing blocks (dirt/gravel/grass=0.5–1, stone=3, bedrock=Infinity / breakable=false). (0.5 day)
2. **Drop table** — Add basic drop configs for ores and common blocks. (0.5 day)
3. **Item model (tools)** — Add minimal `tools` bag in `useGameStore` and create a small registry of `ToolDef`s with tiers and efficiencies. Add demo tools to seeded inventory. (1 day)
4. **Mining progress state** — Implement `startMining/stopMining` event handlers in `GameScene`/`PlayerController` and keep progress ticked in fixed-step. (1 day)
5. **UI & FX** — Add break-progress overlay, sounds, and break particles triggered on completion. (1 day)
6. **Tests & polish** — Add unit/integration tests and tune values. (1 day)

---

## Acceptance criteria

- Mining time respects hardness and tool efficiency across tested combinations.
- Tools lose durability and can be destroyed.
- Break-progress UI and sounds are present and match progress (manual visual check + integration tests).

---

## Risks & notes

- Inventory changes risk causing cascade changes; prefer the minimal separate `tools` bag approach to lower risk.
- Mining progress should be single-player only (no network yet) — if multiplayer is added, mining ownership/state must be synchronized server-side.

**Next step:** create memory/tasks entries and a small PR implementing `hardness` + a demo tool + break-progress overlay for rapid feedback.
