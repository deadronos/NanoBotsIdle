# DESIGN003 - Minecraft-like Feature Roadmap

## Summary

A staged roadmap for expanding NanoBots Idle into a fuller Minecraft-style sandbox while preserving current voxel invariants and performance caps.

## Guiding principles

- Keep `World` and `THREE.*` objects out of Zustand/ECS.
- Preserve per-frame rebuild/swap caps for performance.
- Prefer small, test-backed increments for core voxel math and interaction rules.

## Phase 1: Survival basics (short term)

- Persistence: save/load world state (IndexedDB).
- Lighting propagation + torches (block light level, daylight curve).
- Tools + durability (break speed modifiers, tool crafting).
- Item drops (pickups, stack limits).
- Simple audio feedback (break/place/footsteps).

## Phase 2: World depth (mid term)

- Biomes + structures (trees, ruins, ore veins).
- Mobs + AI (passive + hostile).
- Farming + food (hunger, regen).
- Weather + particles (rain, fog bursts).
- Map/coordinates UI improvements.

## Phase 3: Systemic growth (long term)

- Multiplayer (authoritative server).
- Redstone-style automation or power network.
- Advanced crafting stations and progression tiers.
- Terrain LOD or greedy meshing upgrades.

## Dependencies and prerequisites

- Persistence before multiplayer or long-term progression.
- Lighting before torches or nighttime survival tuning.
- Tools/durability before loot tables and mob balance.

## Testing focus

- World save/load integrity and chunk boundary correctness.
- Light propagation edge cases (chunk edges, caves).
- Tool durability and crafting rule correctness.
