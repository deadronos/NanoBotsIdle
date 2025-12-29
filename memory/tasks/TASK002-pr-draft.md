# PR Draft - TASK002: Centralize terrain & constants

**Goal:** Centralize terrain generation and shared constants, extract instanced helper utilities, and migrate World/Player/Particles to use the new APIs.

## Summary of changes

- Added `src/constants.ts` (WATER_LEVEL, BASE_SEED, PRESTIGE_SEED_DELTA, WORLD_RADIUS, PLAYER_HEIGHT, movement/physics constants).
- Added `src/sim/terrain.ts` with `computeVoxel`, `getSeed`, `getSurfaceHeight`, `getSmoothHeight`, `generateInstances`.
- Added `src/sim/player.ts` with `getPlayerGroundHeight` helper.
- Added `src/render/instanced.ts` helpers: `setInstanceTransform`, `setInstanceColor`, `applyInstanceUpdates`, `populateInstancedMesh`.
- Updated `src/components/World.tsx` to use `generateInstances` and `populateInstancedMesh`.
- Updated `src/components/Player.tsx` to use `getPlayerGroundHeight` and `WATER_LEVEL`.
- Migrated particle updates in `src/components/Drones.tsx` to use instanced helpers.
- Added/updated tests under `tests/`: constants, terrain, voxel, instanced helpers, instanced utils, world generation, player physics.
- Fixed lint/type issues and addressed a11y concerns in `SettingsModal.tsx`.
- Verified `npm test`, `npm run typecheck`, and `npm run build` (build successful, bundle size warning noted).

## Tests & QA

- Run `npm test` (all tests pass).
- Run `npm run typecheck` (no errors).
- Run `npm run lint` and address suggestions (done).
- Manual check: `npm run dev` + play the game, test walking/particle effects/core loops.

## Files to review (high level)

- `src/constants.ts`
- `src/sim/terrain.ts`
- `src/sim/player.ts`
- `src/render/instanced.ts`
- `src/components/World.tsx`
- `src/components/Player.tsx`
- `src/components/Drones.tsx` (Particles changes)
- `tests/*` (new tests)

## Acceptance checklist (for PR)

- [ ] All tests pass
- [ ] `tsc` type checks without errors
- [ ] Lint passes or autofix applied
- [ ] Short description in PR body explaining why and listing risk/validation steps
- [ ] Include link to `memory/designs/DESIGN002-centralize-terrain-and-constants.md`

---

If you want, I can:
- Create a feature branch and open a PR with these changes, or
- Keep changes on this branch and prepare a patch file you can review first.

Which do you prefer?
