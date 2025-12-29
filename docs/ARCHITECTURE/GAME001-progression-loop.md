## GAME001: Progression Loop (Mine → Upgrades → Prestige)

**Status:** Draft (intended rules)  
**Last updated:** 2025-12-29

## Core loop

1. Player mines voxels (click-based).
2. Drones mine voxels automatically.
3. Mining yields credits (scaled by prestige multiplier).
4. Credits buy upgrades (more drones, faster mining, etc.).
5. Prestige regenerates the world and increases long-term yield.

## Mining rules

- Mining is only allowed if the target voxel is a frontier voxel (has at least
  one air neighbor). See `TECH002`.
- Bedrock is indestructible.

## Drones

### Starter drones

- Starter drones can only mine targets above water (to keep early game readable
  and avoid underwater edge cases).
- Starter drones use the same frontier-only mineability rule as the player.

### Target count / performance target

- The architecture should comfortably support ~50 drones.
- Drone count is soft-capped via upgrade costs (config-driven; see below).

## Upgrades and balance (config-driven)

Balance values must be tweakable via `src/config/*`, not hard-coded in UI.

For drone count in particular:

- Make early drones relatively cheap and ramp slowly.
- After a threshold (knee), increase costs more steeply.
- The knee and multipliers must be config values.

Suggested cost curve shape (piecewise exponential):

- For `count <= knee`: `cost = base * preMult^(count - startCount)`
- For `count > knee`: `cost = cost(knee) * postMult^(count - knee)`

## Prestige rule and soft-lock prevention

Prestige must not be able to soft-lock a run.

- Prestige requires at least `prestige.minAboveWaterBlocks` mineable blocks to
  exist above water in a fresh world.
- World generation must retry (or adjust parameters) until the requirement is
  met, up to a configured retry budget.

## Out of scope (planned future)

- Underwater-capable drones (swim/fly hybrid or dedicated underwater type).
- Buildings/factories, storage, refining chains, logistics.
- Multiple materials/ores beyond basic value tiers.
