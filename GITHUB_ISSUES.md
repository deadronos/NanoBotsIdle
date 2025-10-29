# GitHub Issues Template

This document contains the template for creating GitHub issues for each milestone. Copy each section into a new GitHub issue.

---

## Phase 0: Foundation & Core Loop

### Issue #1: Core Production Chain (Milestone 0.1)
**Labels**: `enhancement`, `core-systems`, `Phase-0`, `MVP`
**Milestone**: Phase 0 - Foundation
**Priority**: P0 (Critical)

**Description**:
Complete the basic production chain with extractors → assemblers → fabricators pipeline working correctly.

**Current Status**: Partially implemented in prototype

**Tasks**:
- [ ] Verify production formulas match balance.ts specifications
- [ ] Test heat-limited throughput with formula: `output_per_sec = k * (tier^1.5) / (1 + heatRatio)`
- [ ] Add visual feedback for production progress in UI
- [ ] Implement building placement cost validation

**Acceptance Criteria**:
- Buildings produce resources at expected rates
- Heat affects throughput visibly
- Resource flow visible in UI

**Technical Notes**:
See `src/sim/balance.ts` for production formulas and `src/ecs/systems/productionSystem.ts` for implementation.

---

### Issue #2: Drone Hauling System (Milestone 0.2)
**Labels**: `enhancement`, `core-systems`, `Phase-0`, `MVP`
**Milestone**: Phase 0 - Foundation
**Priority**: P0 (Critical)
**Dependencies**: #1

**Description**:
Implement autonomous drone movement for resource hauling between buildings with proper pathfinding and congestion handling.

**Current Status**: Basic movement and assignment implemented

**Tasks**:
- [ ] Implement proper pathfinding with A* or flow-field
- [ ] Add congestion tracking to grid
- [ ] Visualize drone movement paths
- [ ] Test hauling efficiency formula: `efficiency = 1 / (1 + (D/K)^2)`

**Acceptance Criteria**:
- Drones pick up from source and deliver to destination
- Multiple drones don't deadlock
- Visual feedback shows drone cargo state

**Technical Notes**:
See `src/ecs/systems/pathfindingSystem.ts` and `src/ecs/systems/movementSystem.ts`

---

### Issue #3: Basic UI & Controls (Milestone 0.3)
**Labels**: `enhancement`, `ui`, `Phase-0`, `MVP`
**Milestone**: Phase 0 - Foundation
**Priority**: P0 (Critical)
**Dependencies**: #1, #2

**Description**:
Polish and complete all UI panels for building placement, monitoring, and game control.

**Tasks**:
- [ ] Polish TopBar to show heat/power/throughput
- [ ] Complete BuildPanel with all building types
- [ ] Add AIPanel tabs (Routing Priorities, Diagnostics)
- [ ] Implement BottomBar phase indicator
- [ ] Add building selection and info display
- [ ] Create ghost building placement mode

**Acceptance Criteria**:
- All panels display live data from uiSnapshot
- Users can place buildings via UI
- Selected buildings show details
- Ghost buildings can be queued

**Technical Notes**:
UI components in `src/ui/panels/`

---

### Issue #4: Save/Load System (Milestone 0.4)
**Labels**: `enhancement`, `persistence`, `Phase-0`, `MVP`
**Milestone**: Phase 0 - Foundation
**Priority**: P1 (High)
**Dependencies**: #3

**Description**:
Implement game state persistence to localStorage with migration support for version changes.

**Tasks**:
- [ ] Implement save state serialization
- [ ] Create migration system for version changes
- [ ] Add autosave every 30 seconds
- [ ] Implement manual save/load UI
- [ ] Test state restoration across sessions

**Acceptance Criteria**:
- Game state persists across browser refreshes
- Meta upgrades saved separately from run state
- Migration handles old save formats gracefully

**Technical Notes**:
See design docs in `01-technical-scaffolding.md` for state structure

---

## Phase 1: Three-Phase Progression

### Issue #5: Phase 1 - Bootstrap Progression (Milestone 1.1)
**Labels**: `enhancement`, `game-design`, `Phase-1`, `MVP`
**Milestone**: Phase 1 - Progression
**Priority**: P1 (High)
**Dependencies**: #4

**Description**:
Implement the first 15 minutes of gameplay with unlock progression and cost scaling.

**Tasks**:
- [ ] Implement first 10 unlocks timeline (see 01-progression-balance-draft.md)
- [ ] Add unlock triggers for Ghost Building (minute ~5)
- [ ] Add unlock triggers for Routing Priorities (minute ~7)
- [ ] Implement quadratic cost scaling for drones: `cost(n) = a*n² + b*n + c`
- [ ] Add tutorial tooltips for first-time players
- [ ] Create progression markers at 2min, 5min, 10min

**Acceptance Criteria**:
- Players can build 3-5 drones in first 15 minutes
- Ghost building unlocks after building 2-3 drones
- Routing priorities become available after logistics complexity increases
- Cost scaling feels appropriate (not too easy, not too grindy)

**Design Reference**:
See `01-progression-balance-draft.md` for detailed timeline

---

### Issue #6: Phase 2 - Networked Logistics (Milestone 1.2)
**Labels**: `enhancement`, `game-design`, `Phase-1`, `MVP`
**Milestone**: Phase 1 - Progression
**Priority**: P1 (High)
**Dependencies**: #5

**Description**:
Implement power system, cooling, and Fork Process unlock for mid-game complexity (15-25 minute mark).

**Tasks**:
- [ ] Implement Power Vein segments as placeable buildings
- [ ] Create power grid system with demand/supply
- [ ] Add Cooler buildings for heat management
- [ ] Unlock Fork Process button (minute ~16)
- [ ] Implement Diagnostics tab in AIPanel
- [ ] Add bottleneck detection system

**Acceptance Criteria**:
- Power veins must connect buildings to core
- Buildings go offline without power
- Coolers reduce heat meaningfully
- Diagnostics show starved buildings
- Fork Process button appears at right time

---

### Issue #7: Phase 3 - Overclock Mode (Milestone 1.3)
**Labels**: `enhancement`, `game-design`, `Phase-1`, `MVP`
**Milestone**: Phase 1 - Progression
**Priority**: P1 (High)
**Dependencies**: #6

**Description**:
Implement dramatic endgame with Overclock mode, heat crisis, and self-termination mechanics (25-45 minute mark).

**Tasks**:
- [ ] Implement Overclock toggle in BottomBar
- [ ] Apply overclock multipliers to production
- [ ] Track stress_seconds accumulation
- [ ] Add Self-Termination Protocols (scrap for shards)
- [ ] Create heat cascade failure mechanics
- [ ] Add visual effects for critical heat states

**Acceptance Criteria**:
- Overclock visibly increases throughput 2-5x
- Heat rises rapidly under overclock
- Players can survive 10-15 minutes in overclock
- Cascade failure feels inevitable but controllable
- Scrapping gives meaningful shard boost

---

## Phase 2: Prestige & Meta Progression

### Issue #8: Compile Shard System (Milestone 2.1)
**Labels**: `enhancement`, `prestige`, `Phase-2`, `MVP`
**Milestone**: Phase 2 - Meta Progression
**Priority**: P1 (High)
**Dependencies**: #7

**Description**:
Implement prestige currency calculation and flow with real-time shard projection.

**Tasks**:
- [ ] Implement shard formula: `A*sqrt(peak_throughput) + B*log2(cohesion_score+1) + C*(stress_seconds)^0.7`
- [ ] Create CompileScoringSystem to track metrics
- [ ] Add real-time shard projection in TopBar
- [ ] Implement prestige button and flow
- [ ] Create prestige screen showing breakdown
- [ ] Handle world reset after prestige

**Acceptance Criteria**:
- Shard calculation matches design spec
- Players see projected shards in real-time
- Prestige resets run state but keeps meta state
- Breakdown shows contribution of each factor

**Technical Notes**:
Formula in `src/sim/balance.ts`, need CompileScoringSystem implementation

---

### Issue #9: Meta Upgrade Trees (Milestone 2.2)
**Labels**: `enhancement`, `prestige`, `Phase-2`, `MVP`
**Milestone**: Phase 2 - Meta Progression
**Priority**: P1 (High)
**Dependencies**: #8

**Description**:
Implement three data-driven upgrade trees with JSON definitions and UI.

**Tasks**:
- [ ] Create upgrade JSON data files (see 01-json-data-driven-upgrades.md)
- [ ] Implement Swarm Cognition tree (4 tiers)
- [ ] Implement Bio-Structure Templates tree (4 tiers)
- [ ] Implement Compiler Optimization tree (4 tiers)
- [ ] Create meta upgrade UI panels
- [ ] Wire upgrade effects into createWorld()
- [ ] Add unlock gating by prestige count

**Acceptance Criteria**:
- All 12 meta upgrades defined in JSON
- Players can spend shards on upgrades
- Upgrades affect next run immediately
- UI shows locked/available/purchased states
- Each tree has clear progression path

**Design Reference**:
See `01-json-data-driven-upgrades.md` for JSON structure

---

### Issue #10: Enhanced Starting Conditions (Milestone 2.3)
**Labels**: `enhancement`, `prestige`, `Phase-2`, `MVP`
**Milestone**: Phase 2 - Meta Progression
**Priority**: P1 (High)
**Dependencies**: #9

**Description**:
Apply meta upgrades to create meaningful variety in starting conditions across runs.

**Tasks**:
- [ ] Apply starting radius from bio upgrades
- [ ] Apply starting extractor tier boost
- [ ] Spawn specialist drones from swarm upgrades
- [ ] Add starting inventory from seed stockpile
- [ ] Apply passive cooling bonus to heat cap
- [ ] Test progression curve across runs 1-5

**Acceptance Criteria**:
- Run 2 feels noticeably faster than Run 1
- Each tree provides distinct benefits
- Starting conditions scale appropriately
- Players reach Phase 3 faster in later runs

---

## Phase 3: Mid-Run Evolution (Fork Process)

### Issue #11: Fork Mechanics (Milestone 3.1)
**Labels**: `enhancement`, `fork-system`, `Phase-3`
**Milestone**: Phase 3 - Fork Process
**Priority**: P2 (Medium)
**Dependencies**: #10

**Description**:
Implement intra-run mini-prestige system where players sacrifice drones for Fork Points to buy behavior modules.

**Tasks**:
- [ ] Create Fork Process action (kill drones → grant Fork Points)
- [ ] Implement Fork Point calculation based on drone count/value
- [ ] Create run-local behavior context (see 01-more-progression-drafts.md)
- [ ] Add Fork behavior merging system
- [ ] Create Fork modal UI
- [ ] Implement post-fork drone respawn

**Acceptance Criteria**:
- Players can trigger Fork after Phase 1
- Fork grants proportional Fork Points
- All drones are removed on Fork
- New drones spawn with enhanced behaviors
- Fork Points reset on prestige

---

### Issue #12: Fork Behavior Modules (Milestone 3.2)
**Labels**: `enhancement`, `fork-system`, `Phase-3`
**Milestone**: Phase 3 - Fork Process
**Priority**: P2 (Medium)
**Dependencies**: #11

**Description**:
Create 5+ behavior modules that modify drone AI and system priorities for run customization.

**Tasks**:
- [ ] Create fork modules JSON (see 01-json-data-driven-upgrades.md)
- [ ] Implement Predictive Hauler module
- [ ] Implement Builder Swarm Instinct module
- [ ] Implement Emergency Cooling Protocol module
- [ ] Implement Cannibalize & Reforge module
- [ ] Implement Priority Surge module
- [ ] Wire module effects into systems

**Acceptance Criteria**:
- All 5 modules defined in JSON
- Modules affect drone behavior visibly
- Players can buy multiple modules per Fork
- Module costs balanced for mid-run economy
- Dependencies and requirements enforced

---

### Issue #13: Advanced Drone Behaviors (Milestone 3.3)
**Labels**: `enhancement`, `fork-system`, `ai`, `Phase-3`
**Milestone**: Phase 3 - Fork Process
**Priority**: P2 (Medium)
**Dependencies**: #12

**Description**:
Implement visible AI improvements from Fork modules across all drone systems.

**Tasks**:
- [ ] Implement prefetch/low-water-mark hauling
- [ ] Add builder coordination (avoid duplicate targets)
- [ ] Create heat-critical routing override
- [ ] Implement recycling/refund mechanics
- [ ] Add overclock priority surge logic
- [ ] Test behavior improvements visually

**Acceptance Criteria**:
- Predictive hauling reduces starvation
- Builders efficiently complete blueprints
- Emergency cooling extends survival
- Recycling accelerates post-fork rebuild
- Priority surge maximizes overclock output

---

## Phase 4: Polish & Content

### Issue #14: Advanced Pathfinding (Milestone 4.1)
**Labels**: `enhancement`, `optimization`, `Phase-4`
**Milestone**: Phase 4 - Polish
**Priority**: P2 (Medium)
**Dependencies**: #13

**Description**:
Implement smooth swarm movement with congestion avoidance and flow-field pathfinding.

**Tasks**:
- [ ] Implement flow-field pathfinding
- [ ] Add congestion penalty to path costs
- [ ] Create visual path debug overlay
- [ ] Implement swarm cognition level effects
- [ ] Add lane emergence from congestion avoidance
- [ ] Optimize pathfinding performance

**Acceptance Criteria**:
- Drones avoid traffic jams naturally
- Higher congestion awareness = better paths
- 50+ drones don't cause performance issues
- Emergent laning visible with many drones

---

### Issue #15: Visual Polish & Effects (Milestone 4.2)
**Labels**: `enhancement`, `ui`, `polish`, `Phase-4`, `MVP`
**Milestone**: Phase 4 - Polish
**Priority**: P1 (High)
**Dependencies**: #7

**Description**:
Add juice and visual satisfaction to enhance the game feel and feedback loops.

**Tasks**:
- [ ] Add pulsing animations for power veins
- [ ] Create heat glow effects on buildings
- [ ] Add drone trail effects during movement
- [ ] Implement building construction animations
- [ ] Create cascading failure visual sequence
- [ ] Add particle effects for production
- [ ] Polish UI transitions and micro-interactions

**Acceptance Criteria**:
- Swarm movement is visually satisfying
- Heat danger is immediately recognizable
- Buildings feel alive and productive
- Overclock/meltdown is dramatic
- UI feels responsive and polished

---

### Issue #16: Audio & Feedback (Milestone 4.3)
**Labels**: `enhancement`, `audio`, `polish`, `Phase-4`
**Milestone**: Phase 4 - Polish
**Priority**: P2 (Medium)
**Dependencies**: #15

**Description**:
Implement sound design to enhance feedback loops and game atmosphere.

**Tasks**:
- [ ] Add ambient factory hum (scales with activity)
- [ ] Create building placement sounds
- [ ] Add drone spawn/movement sounds
- [ ] Implement warning sounds for heat thresholds
- [ ] Create prestige/unlock celebration sounds
- [ ] Add overclock dramatic audio cues
- [ ] Volume controls and audio settings

**Acceptance Criteria**:
- Audio reinforces game state
- Warning sounds help prevent mistakes
- Prestige moment feels rewarding
- Audio can be muted/adjusted

---

### Issue #17: Additional Building Types (Milestone 4.4)
**Labels**: `enhancement`, `content`, `Phase-4`
**Milestone**: Phase 4 - Content
**Priority**: P3 (Low)
**Dependencies**: #16

**Description**:
Add more variety to production chains with new building types and resources.

**Tasks**:
- [ ] Design and implement Storage buildings
- [ ] Create additional resource types (Iron, Silicon)
- [ ] Add advanced assembler recipes
- [ ] Implement CoreCompiler building (endgame focus)
- [ ] Add building tier upgrade system
- [ ] Balance new buildings against existing ones

**Acceptance Criteria**:
- Storage reduces hauling overhead
- New resources create deeper chains
- Advanced recipes unlock in Phase 2/3
- CoreCompiler is meaningful overclock target
- Tier upgrades feel impactful

---

### Issue #18: Maintainer Drones (Milestone 4.5)
**Labels**: `enhancement`, `content`, `Phase-4`
**Milestone**: Phase 4 - Content
**Priority**: P3 (Low)
**Dependencies**: #17

**Description**:
Implement third specialized drone role for late-game complexity.

**Tasks**:
- [ ] Design Maintainer role mechanics
- [ ] Implement building degradation system (optional)
- [ ] Create maintenance job assignment
- [ ] Add Maintainer AI to drone systems
- [ ] Balance Maintainer usefulness
- [ ] Add UI for Maintainer activity

**Acceptance Criteria**:
- Maintainers have clear purpose
- Late-game runs benefit from Maintainers
- Maintainer specialists available via meta upgrades
- Players understand when to build Maintainers

---

## Phase 5: Endgame & Content Expansion

### Issue #19: Extended Meta Trees (Milestone 5.1)
**Labels**: `enhancement`, `content`, `endgame`, `Phase-5`
**Milestone**: Phase 5 - Endgame
**Priority**: P3 (Low)
**Dependencies**: #18

**Description**:
Extend meta progression for long-term play with deeper upgrade trees.

**Tasks**:
- [ ] Add Tier 5+ to each meta tree
- [ ] Create "mastery" upgrades for each tree
- [ ] Add cross-tree synergy upgrades
- [ ] Implement exponential shard costs at high tiers
- [ ] Balance for 20+ prestige runs
- [ ] Add achievement/milestone tracking

**Acceptance Criteria**:
- Meta trees support 20+ runs of progression
- High-tier upgrades feel transformative
- Shard costs prevent trivial progression
- Synergies encourage tree mixing

---

### Issue #20: Challenge Modes (Milestone 5.2)
**Labels**: `enhancement`, `content`, `endgame`, `Phase-5`
**Milestone**: Phase 5 - Endgame
**Priority**: P3 (Low)
**Dependencies**: #19

**Description**:
Add replayability through challenge modifiers and constraints.

**Tasks**:
- [ ] Design challenge modifier system
- [ ] Implement limited resources challenge
- [ ] Create no-overclock challenge
- [ ] Add speed-run mode
- [ ] Create high heat start challenge
- [ ] Add reward multipliers for challenges

**Acceptance Criteria**:
- Challenges modify run rules
- Rewards scale with difficulty
- Leaderboards track challenge runs
- Challenges unlock gradually

---

### Issue #21: Statistics & Analytics (Milestone 5.3)
**Labels**: `enhancement`, `content`, `analytics`, `Phase-5`
**Milestone**: Phase 5 - Endgame
**Priority**: P3 (Low)
**Dependencies**: #20

**Description**:
Implement detailed statistics tracking and visualization for optimization gameplay.

**Tasks**:
- [ ] Track detailed per-run statistics
- [ ] Create stats screen with graphs
- [ ] Implement run history comparison
- [ ] Add efficiency metrics (atoms per drone, etc.)
- [ ] Create personal best tracking
- [ ] Export stats to JSON/CSV

**Acceptance Criteria**:
- Players can review past runs
- Graphs show progression over time
- Efficiency metrics guide optimization
- Data exportable for external analysis

---

## Quick Reference

### Priority Levels:
- **P0 (Critical)**: Must-have for MVP, blocking
- **P1 (High)**: Core features for 1.0 release
- **P2 (Medium)**: Important but can be deferred
- **P3 (Low)**: Nice-to-have, post-1.0 content

### Labels:
- `Phase-0`, `Phase-1`, `Phase-2`, `Phase-3`, `Phase-4`, `Phase-5`: Development phases
- `MVP`: Required for minimum viable product
- `core-systems`: Core game systems
- `ui`: User interface
- `game-design`: Game design and balance
- `prestige`: Prestige/meta progression
- `fork-system`: Fork Process features
- `content`: New content and features
- `polish`: Visual/audio polish
- `optimization`: Performance improvements
- `endgame`: Late-game content
- `enhancement`: Feature additions
- `bug`: Bug fixes (not listed above)
- `documentation`: Documentation improvements

### Milestones:
Create GitHub milestones to track:
1. Phase 0 - Foundation (Issues #1-4)
2. Phase 1 - Progression (Issues #5-7)
3. Phase 2 - Meta Progression (Issues #8-10)
4. Phase 3 - Fork Process (Issues #11-13)
5. Phase 4 - Polish (Issues #14-18)
6. Phase 5 - Endgame (Issues #19-21)

---

## Instructions for Creating Issues

1. Create milestones in GitHub first (Phase 0 through Phase 5)
2. Copy each issue template above into a new GitHub issue
3. Assign appropriate labels and milestone
4. Set priority in issue title or description
5. Link dependencies in issue body
6. Assign to appropriate team members
7. Add to project board if using GitHub Projects

**Note**: The user will need to create these issues manually in the GitHub web interface, as the toolset doesn't support direct issue creation.
