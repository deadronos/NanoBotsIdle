# Milestone Implementation Guide

Quick reference for implementing the milestones outlined in `MILESTONES.md`.

## Overview

This project follows a phased development approach with 21 milestones across 5 phases:

- **Phase 0**: Foundation & Core Loop (4 milestones)
- **Phase 1**: Three-Phase Progression (3 milestones)  
- **Phase 2**: Prestige & Meta Progression (3 milestones)
- **Phase 3**: Mid-Run Evolution / Fork Process (3 milestones)
- **Phase 4**: Polish & Content (5 milestones)
- **Phase 5**: Endgame & Content Expansion (3 milestones)

## Critical Path to MVP (1.0)

The minimum viable product requires completing:

1. **Phase 0** (All 4 milestones) - ~2-3 weeks
   - Core production chain
   - Drone hauling
   - Basic UI
   - Save/load

2. **Phase 1** (All 3 milestones) - +2-3 weeks (4-5 weeks total)
   - Bootstrap progression (0-15min)
   - Networked logistics (15-25min)
   - Overclock mode (25-45min)

3. **Phase 2** (All 3 milestones) - +3-4 weeks (7-9 weeks total)
   - Compile shard system
   - Meta upgrade trees
   - Enhanced starting conditions

4. **Visual Polish** (Milestone 4.2) - +1-2 weeks (8-11 weeks total)
   - Animations and effects
   - Visual feedback
   - UI polish

**Total MVP Timeline: 10-12 weeks**

## Design Documents Reference

The project has comprehensive design documents that should guide implementation:

### Core Game Design
- **01-chatgpt-idea.md**: Original concept with ECS architecture
  - Entity/Component/System structure
  - Simulation architecture
  - Save data model
  - First-run pacing (0-45 min)

### Technical Architecture  
- **01-technical-scaffolding.md**: Complete technical spec
  - Project structure (src/ecs, src/state, src/ui, src/sim)
  - ECS types and components
  - Zustand store layout (run vs meta slices)
  - System tick order
  - React component tree

- **01-technical-drafts.md**: Implementation details
  - balance.ts formulas (polynomial scaling, throughput, shards)
  - createWorld(meta) bootstrapping
  - uiSnapshotSystem bridge to React

### Game Balance & Progression
- **01-progression-balance-draft.md**: Detailed progression design
  - Meta upgrade trees (3 trees × 4 tiers each)
  - First 10 unlocks in Run 1 (minute-by-minute)
  - Fork Process behavior modules (5 modules)
  - Concrete upgrade effects

### Data-Driven Systems
- **01-json-data-driven-upgrades.md**: JSON structure for upgrades
  - Meta upgrades format
  - Fork modules format
  - Effect application system
  - Example JSON structures

- **01-more-progression-drafts.md**: Fork system details
  - Run behavior context
  - Module effect merging
  - Fork UI components
  - System integration

## Key Formulas

### Production Throughput
```
output_per_sec = baseRate * (tier^1.5) / (1 + heatRatio)
where heatRatio = heatCurrent / heatSafeCap
```

### Cost Scaling (Polynomial)
```
cost(n) = base * (n² * scaleA + n * scaleB + scaleC)
```

### Drone Hauling Efficiency
```
efficiency = 1 / (1 + (droneCount / optimalDensity)²)
totalRate = droneCount * basePerDrone * efficiency
```

### Compile Shard Yield
```
shards = yieldMult * (
  A * √(peak_throughput) +
  B * log₂(cohesion_score + 1) +
  C * (stress_seconds)^0.7
)

Suggested: A=1.5, B=4.0, C=0.9
```

## Directory Structure

```
src/
  ecs/
    components/     # Position, Inventory, Producer, DroneBrain, etc.
    systems/        # demandPlanning, droneAssignment, pathfinding, etc.
    world/          # World.ts, createWorld.ts, tickWorld.ts
  state/
    runSlice.ts     # Per-run state (wiped on prestige)
    metaSlice.ts    # Persistent state (Compile Shards, unlocks)
    store.ts        # Zustand store
    persistence.ts  # Save/load logic
  sim/
    balance.ts      # All formulas and cost curves
    simLoop.ts      # Game loop with requestAnimationFrame
  ui/
    panels/         # TopBar, BuildPanel, AIPanel, BottomBar
    simview/        # FactoryCanvas and overlays
    App.tsx         # Main shell
  types/
    resources.ts    # Resource types
    buildings.ts    # Building types and recipes
    drones.ts       # Drone roles and behaviors
```

## Implementation Order

### Week 1-2: Phase 0 Foundation
1. Verify production system formulas
2. Implement A* pathfinding
3. Polish UI panels with real data
4. Add save/load with localStorage

### Week 3-4: Phase 1 Early Game
1. Unlock system with time triggers
2. Ghost building placement
3. Routing priorities UI
4. Quadratic cost scaling

### Week 5-6: Phase 1 Mid-Late Game
1. Power vein system
2. Cooler buildings
3. Overclock toggle
4. Heat cascade mechanics

### Week 7-8: Phase 2 Prestige
1. Compile shard calculation
2. Create prestige screen
3. JSON upgrade definitions
4. Meta upgrade UI

### Week 9-10: Phase 2 Meta Effects
1. Wire upgrades to createWorld()
2. Test starting condition variety
3. Balance progression across runs
4. Prestige loop polish

### Week 11-12: Visual Polish
1. Animation system
2. Particle effects
3. Heat glow effects
4. UI transitions

## Testing Checklist

### Core Systems
- [ ] Buildings produce at correct rates
- [ ] Heat affects throughput correctly
- [ ] Drones move and deliver resources
- [ ] No pathfinding deadlocks with 10+ drones
- [ ] Cost scaling feels balanced

### Progression
- [ ] Run 1 takes 40-60 minutes
- [ ] Unlocks trigger at appropriate times
- [ ] Phase transitions feel natural
- [ ] Overclock creates tension

### Prestige
- [ ] Shard calculation matches formula
- [ ] Meta upgrades apply to next run
- [ ] Run 2+ faster than Run 1
- [ ] Clear progression benefit

### Performance
- [ ] 60 FPS with 50+ drones
- [ ] Save/load < 1 second
- [ ] No memory leaks in 2+ hour session
- [ ] Bundle size < 500KB gzipped

## Common Pitfalls

### ECS Architecture
- **Don't** mix React state with World state
- **Do** use uiSnapshot for all UI reads
- **Don't** mutate components outside systems
- **Do** maintain strict system tick order

### Balance
- **Don't** add exponential scaling
- **Do** use polynomial curves
- **Don't** make upgrades feel mandatory
- **Do** make each upgrade feel impactful

### UI/UX
- **Don't** hide important information
- **Do** show clear visual feedback
- **Don't** make players guess next steps
- **Do** provide tooltips and hints

### Performance
- **Don't** recalculate paths every frame
- **Do** cache and invalidate smartly
- **Don't** create objects in hot loops
- **Do** use object pools for entities

## Next Steps

1. **Review Design Docs**: Read all 01-*.md files thoroughly
2. **Set Up Milestones**: Create GitHub milestones for each phase
3. **Create Issues**: Use GITHUB_ISSUES.md as templates
4. **Start Phase 0**: Begin with core production chain
5. **Iterate**: Test early and often

## Resources

- Design Docs: `01-*.md` files in root
- Milestones: `MILESTONES.md`
- Issue Templates: `GITHUB_ISSUES.md`
- README: `README.md`

## Questions?

When implementing, always ask:
1. Does this match the design docs?
2. Is this data-driven or hardcoded?
3. Will this scale to 50+ drones?
4. Does this create interesting choices?
5. Is the visual feedback clear?

---

**Good luck building NanoFactory Evolution!** 🤖⚡
