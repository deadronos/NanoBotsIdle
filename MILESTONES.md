# NanoFactory Evolution - Development Milestones

This document outlines the development roadmap for NanoFactory Evolution, organized into phases matching the game's three-phase structure. Each milestone includes specific features, acceptance criteria, and dependencies.

## Project Status Summary

**Current State**: Prototype with basic ECS architecture, UI shell, and core systems
**Target**: Full game loop with prestige system, meta upgrades, and Fork Process

---

## Phase 0: Foundation & Core Loop (MVP)

### Milestone 0.1: Core Production Chain ✅ (PARTIALLY COMPLETE)
**Goal**: Basic extractors → assemblers → fabricators pipeline working

**Status**: Mostly implemented in prototype

**Remaining Tasks**:
- [ ] Verify production formulas match balance.ts specifications
- [ ] Test heat-limited throughput with formula: `output_per_sec = k * (tier^1.5) / (1 + heatRatio)`
- [ ] Add visual feedback for production progress in UI
- [ ] Implement building placement cost validation

**Acceptance Criteria**:
- Buildings produce resources at expected rates
- Heat affects throughput visibly
- Resource flow visible in UI

---

### Milestone 0.2: Drone Hauling System ✅ (PARTIALLY COMPLETE)
**Goal**: Drones autonomously move resources between buildings

**Status**: Basic movement and assignment implemented

**Remaining Tasks**:
- [ ] Implement proper pathfinding with A* or flow-field
- [ ] Add congestion tracking to grid
- [ ] Visualize drone movement paths
- [ ] Test hauling efficiency formula: `efficiency = 1 / (1 + (D/K)^2)`

**Acceptance Criteria**:
- Drones pick up from source and deliver to destination
- Multiple drones don't deadlock
- Visual feedback shows drone cargo state

**Dependencies**: Milestone 0.1

---

### Milestone 0.3: Basic UI & Controls
**Goal**: Functional panels for building, monitoring, and control

**Status**: UI shell exists, needs polish

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

**Dependencies**: Milestone 0.1, 0.2

---

### Milestone 0.4: Save/Load System
**Goal**: Persist game state to localStorage

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

**Dependencies**: Milestone 0.3

---

## Phase 1: Three-Phase Progression

### Milestone 1.1: Phase 1 - Bootstrap (0-15min)
**Goal**: Initial gameplay loop with basic scaling

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

**Dependencies**: Milestone 0.4

---

### Milestone 1.2: Phase 2 - Networked Logistics (15-25min)
**Goal**: Power system and mid-run complexity

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

**Dependencies**: Milestone 1.1

---

### Milestone 1.3: Phase 3 - Overclock Mode (25-45min)
**Goal**: Dramatic endgame with heat crisis

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

**Dependencies**: Milestone 1.2

---

## Phase 2: Prestige & Meta Progression

### Milestone 2.1: Compile Shard System
**Goal**: Working prestige currency and calculation

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

**Dependencies**: Milestone 1.3

---

### Milestone 2.2: Meta Upgrade Trees
**Goal**: Three upgrade trees with data-driven structure

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

**Dependencies**: Milestone 2.1

---

### Milestone 2.3: Enhanced Starting Conditions
**Goal**: Meta upgrades create meaningful run variety

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

**Dependencies**: Milestone 2.2

---

## Phase 3: Mid-Run Evolution (Fork Process)

### Milestone 3.1: Fork Mechanics
**Goal**: Intra-run mini-prestige system

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

**Dependencies**: Milestone 2.3

---

### Milestone 3.2: Fork Behavior Modules
**Goal**: 5+ behavior modules for run customization

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

**Dependencies**: Milestone 3.1

---

### Milestone 3.3: Advanced Drone Behaviors
**Goal**: Visible AI improvements from modules

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

**Dependencies**: Milestone 3.2

---

## Phase 4: Polish & Content

### Milestone 4.1: Advanced Pathfinding
**Goal**: Smooth swarm movement with congestion

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

**Dependencies**: Milestone 3.3

---

### Milestone 4.2: Visual Polish & Effects
**Goal**: Juice and visual satisfaction

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

**Dependencies**: Milestone 4.1

---

### Milestone 4.3: Audio & Feedback
**Goal**: Sound design enhancing feedback loops

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

**Dependencies**: Milestone 4.2

---

### Milestone 4.4: Additional Building Types
**Goal**: More variety in production chains

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

**Dependencies**: Milestone 4.3

---

### Milestone 4.5: Maintainer Drones
**Goal**: Third specialized drone role

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

**Dependencies**: Milestone 4.4

---

## Phase 5: Endgame & Content Expansion

### Milestone 5.1: Extended Meta Trees
**Goal**: Deeper progression for long-term play

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

**Dependencies**: Milestone 4.5

---

### Milestone 5.2: Challenge Modes
**Goal**: Replayability through constraints

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

**Dependencies**: Milestone 5.1

---

### Milestone 5.3: Statistics & Analytics
**Goal**: Rich data for optimization gameplay

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

**Dependencies**: Milestone 5.2

---

## Priority Recommendations

### Must-Have for 1.0 Release:
1. Phase 0 (Milestones 0.1-0.4) - Core foundation
2. Phase 1 (Milestones 1.1-1.3) - Three-phase loop
3. Phase 2 (Milestones 2.1-2.3) - Prestige system
4. Milestone 4.2 - Basic visual polish

### High Priority for Post-1.0:
1. Phase 3 (Milestones 3.1-3.3) - Fork Process
2. Milestone 4.1 - Advanced pathfinding
3. Milestone 4.3 - Audio feedback

### Medium Priority (Content Updates):
1. Milestone 4.4 - Additional buildings
2. Milestone 4.5 - Maintainer drones
3. Phase 5 - Extended content

---

## Timeline Estimates

**MVP (Milestones 0.1-0.4)**: 2-3 weeks
- Core systems functional
- Basic UI working
- Save/load implemented

**Alpha (+ Phase 1)**: 4-5 weeks total
- Three-phase progression complete
- Basic game loop validated

**Beta (+ Phase 2)**: 7-9 weeks total
- Prestige system working
- Meta progression functional
- Balance testing begins

**1.0 Release (+ Visual Polish)**: 10-12 weeks total
- Polish and juice added
- Audio implemented
- Public release ready

**Post-1.0 Updates**: Ongoing
- Fork Process (2-3 weeks)
- Additional content (ongoing)
- Community feedback integration

---

## Success Metrics

### Technical Metrics:
- Game runs at 60 FPS with 50+ drones
- Save/load completes in <1 second
- No memory leaks over 2+ hour sessions
- Build size <500KB gzipped

### Game Design Metrics:
- First run to prestige: 40-60 minutes
- Runs 5-10 prestige: 20-30 minutes
- Retention: 70%+ return after first prestige
- Meta tree completion: 15-25 prestige runs

### Player Satisfaction:
- Clear visual feedback for all actions
- No confusion about what to do next
- Satisfying prestige payoff
- "One more run" factor achieved

---

## Notes & Considerations

### Design Principles:
1. **Visual Clarity**: Player should understand system state at a glance
2. **Meaningful Choices**: Every upgrade and building matters
3. **Smooth Scaling**: No sudden difficulty spikes
4. **Emergent Complexity**: Simple rules → complex behavior

### Technical Debt Tracking:
- Use `TODO` comments for code improvements
- Document known issues in GitHub issues
- Prioritize performance optimizations when systems stress-tested
- Refactor systems when patterns emerge

### Community Integration:
- Release early prototypes for feedback
- Balance based on player data
- Iterate on confusing mechanics
- Add QoL features from suggestions

---

## Document Version

**Version**: 1.0
**Last Updated**: 2025-01-XX
**Status**: Draft - Ready for issue creation
**Next Review**: After MVP completion
