# TASK014: Underwater Drones - Proof of Concept

**Status:** In Progress  
**Added:** 2026-01-12  
**Updated:** 2026-01-12  
**Related Design:** `memory/designs/DESIGN010-underwater-drones.md`

## Original Request

Implement underwater-capable drones (DIVER role) as a proof-of-concept for the gameplay expansions feature set. This addresses the limitation in GAME001 where all drones can only mine above water.

## Thought Process

The underwater drone feature is the most straightforward of the three proposed expansions (underwater drones, storage enhancements, production systems). It builds on the existing drone role system (MINER, HAULER) and can be implemented incrementally with TDD.

Key considerations:
1. Reuse existing drone infrastructure (state machine, targeting, physics)
2. Add DIVER as a new role type alongside MINER and HAULER
3. Filter targets by water level in targeting system
4. Visual distinction (blue color) for easy identification
5. Config-driven parameters (speed, cargo, cost)

This PoC will validate:
- Type system extensibility for new roles
- Targeting filter flexibility
- UI integration in ShopModal
- Save system migration patterns
- Performance impact of role-based filtering

## Implementation Plan

Following TDD cycle: Red → Green → Refactor for each subtask.

### Phase 1: Type System & Configuration
- [ ] 1.1: Add "DIVER" to DroneRole type
- [ ] 1.2: Add divers config to DronesConfig
- [ ] 1.3: Add diver cost to EconomyConfig
- [ ] 1.4: Write failing test for DIVER role existence

### Phase 2: Drone Spawning & Management
- [ ] 2.1: Write test: syncDroneCount with diverCount parameter
- [ ] 2.2: Update syncDroneCount signature and implementation
- [ ] 2.3: Ensure DIVERs spawn at underwater positions (y < waterLevel)
- [ ] 2.4: Write test: DIVERs initialized with correct config values

### Phase 3: Underwater Targeting
- [ ] 3.1: Write test: DIVERs only target underwater voxels (y <= waterLevel)
- [ ] 3.2: Write test: MINERs only target above-water voxels (existing constraint)
- [ ] 3.3: Update getRandomTarget to filter by role
- [ ] 3.4: Write test: respects maxDepth configuration (future)

### Phase 4: Economy Integration
- [ ] 4.1: Write test: buyUpgrade("diver") increments diverCount
- [ ] 4.2: Update UiSnapshot type with diverCount field
- [ ] 4.3: Update GameState store with diverCount
- [ ] 4.4: Update getUpgradeCost to handle "diver" type
- [ ] 4.5: Update tryBuyUpgrade to handle "diver" type

### Phase 5: Visual Distinction
- [ ] 5.1: Write test: DIVER role encodes correctly in entityRoles
- [ ] 5.2: Update encode.ts to handle DIVER role (value: 2)
- [ ] 5.3: Update ROLE_COLORS with DIVER blue color (0x0066ff)
- [ ] 5.4: Update droneInstancedVisuals to apply DIVER color

### Phase 6: UI Integration
- [ ] 6.1: Add "Diver Drone" UpgradeCard to ShopModal
- [ ] 6.2: Wire up buy action to simBridge
- [ ] 6.3: Update HUD to display diverCount (optional)
- [ ] 6.4: Manual test: verify card appears and purchase works

### Phase 7: Save Migration
- [ ] 7.1: Write test: v3 save without diverCount migrates to v4
- [ ] 7.2: Create migrateV3ToV4 function
- [ ] 7.3: Update save schema validation
- [ ] 7.4: Test backward/forward compatibility

### Phase 8: Integration & Polish
- [ ] 8.1: Write integration test: DIVER full mining cycle
- [ ] 8.2: Write integration test: HAULER can pick up from DIVER
- [ ] 8.3: Performance test: 25 MINERs + 25 DIVERs at 60fps
- [ ] 8.4: Update GAME001 documentation
- [ ] 8.5: Update ARCHITECTURE.md if needed

## Progress Tracking

**Overall Status:** Not Started - 0% Complete

### Subtasks

| ID  | Description                                     | Status       | Updated    | Notes |
| --- | ----------------------------------------------- | ------------ | ---------- | ----- |
| 1.1 | Add "DIVER" to DroneRole type                   | Not Started  |            |       |
| 1.2 | Add divers config to DronesConfig               | Not Started  |            |       |
| 1.3 | Add diver cost to EconomyConfig                 | Not Started  |            |       |
| 1.4 | Write failing test for DIVER role existence     | Not Started  |            |       |
| 2.1 | Test: syncDroneCount with diverCount            | Not Started  |            |       |
| 2.2 | Update syncDroneCount implementation            | Not Started  |            |       |
| 2.3 | DIVERs spawn underwater                         | Not Started  |            |       |
| 2.4 | Test: DIVER initialization                      | Not Started  |            |       |
| 3.1 | Test: DIVERs target underwater only             | Not Started  |            |       |
| 3.2 | Test: MINERs target above-water only            | Not Started  |            |       |
| 3.3 | Update getRandomTarget filtering                | Not Started  |            |       |
| 3.4 | Test: maxDepth configuration                    | Not Started  |            |       |
| 4.1 | Test: buyUpgrade("diver")                       | Not Started  |            |       |
| 4.2 | Update UiSnapshot type                          | Not Started  |            |       |
| 4.3 | Update GameState store                          | Not Started  |            |       |
| 4.4 | Update getUpgradeCost                           | Not Started  |            |       |
| 4.5 | Update tryBuyUpgrade                            | Not Started  |            |       |
| 5.1 | Test: DIVER role encoding                       | Not Started  |            |       |
| 5.2 | Update encode.ts                                | Not Started  |            |       |
| 5.3 | Update ROLE_COLORS                              | Not Started  |            |       |
| 5.4 | Update droneInstancedVisuals                    | Not Started  |            |       |
| 6.1 | Add UpgradeCard to ShopModal                    | Not Started  |            |       |
| 6.2 | Wire buy action                                 | Not Started  |            |       |
| 6.3 | Update HUD (optional)                           | Not Started  |            |       |
| 6.4 | Manual test UI                                  | Not Started  |            |       |
| 7.1 | Test: v3→v4 migration                           | Not Started  |            |       |
| 7.2 | Create migrateV3ToV4                            | Not Started  |            |       |
| 7.3 | Update schema validation                        | Not Started  |            |       |
| 7.4 | Test compatibility                              | Not Started  |            |       |
| 8.1 | Integration test: DIVER cycle                   | Not Started  |            |       |
| 8.2 | Integration test: HAULER+DIVER                  | Not Started  |            |       |
| 8.3 | Performance test: 50 drones                     | Not Started  |            |       |
| 8.4 | Update GAME001 docs                             | Not Started  |            |       |
| 8.5 | Update ARCHITECTURE.md                          | Not Started  |            |       |

## Progress Log

### 2026-01-12
- Created task document
- Defined implementation plan with TDD approach
- Ready to begin Phase 1
