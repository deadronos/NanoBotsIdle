# DES023 - Implement `createWorld(meta)` bootstrap

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #23

## Motivation / Summary
Implement `src/ecs/world/createWorld.ts` according to `01-technical-drafts.md` so runs can be created from `meta` upgrades.

## Requirements (EARS-style)
- WHEN `createWorld(meta)` is called, THE SYSTEM SHALL return a World object with Core and starting entities per meta [Acceptance: created world contains required entities and inventories]
- WHEN meta contains passive bonuses, THE SYSTEM SHALL apply them to spawned entities (bio, swarm, compiler) [Acceptance: passive bonuses reflected in starting entities]

## High-level design
- Components involved (files, modules)
  - `src/ecs/world/createWorld.ts`
  - Component stores and entity factories
  - Tests in `src/ecs/world/__tests__`
- Data flow / interactions
  - `createWorld` reads `meta` and spawns entities with inventory and starter components; registers components in stores
- Key algorithms or constraints
  - Deterministic seeding (compiler seed values) and applying passive bonuses during spawn

## Acceptance Criteria
- createWorld(meta) produces a valid World object with Core and starting entities matching meta parameters

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Careful about coupling between meta schema and createWorld; keep mappings documented to avoid silent breakage
