# Fork Module Effects Integration Guide

This document explains how fork module effects in `RunBehaviorContext` should be wired into the actual simulation systems.

## Overview

Fork modules modify behavior through the `RunBehaviorContext` object stored in `runSlice`. Systems and drone AI should read from this context to adjust their behavior based on active modules.

## Module Effects Mapping

### 1. Predictive Hauler
**Effects:**
- `prefetchCriticalInputs: true`
- `lowWaterMarkEnabled: true`
- `lowWaterThresholdFraction: 0.3`

**Integration Points:**
- `DroneAssignmentSystem` or `DemandPlanningSystem`
- When assigning hauler tasks, check if `lowWaterMarkEnabled` is true
- If enabled, trigger hauling when inventory falls below `lowWaterThresholdFraction * capacity`
- Normally haulers wait until inventory is near empty; this module makes them fetch early

**Example:**
```typescript
// In demand planning or drone assignment system
const context = world.runBehaviorContext; // Get from world or state
if (context.lowWaterMarkEnabled) {
  const threshold = (context.lowWaterThresholdFraction || 0.3) * building.capacity;
  if (building.inventory < threshold) {
    // Create hauling task
  }
}
```

### 2. Builder Swarm Instinct
**Effects:**
- `buildRadiusBonus: 4`
- `avoidDuplicateGhostTargets: true`

**Integration Points:**
- `DroneBrain` builder state machine
- When builder searches for ghost buildings to construct, extend search radius by `buildRadiusBonus`
- If `avoidDuplicateGhostTargets` is true, mark ghost as "claimed" when a builder starts working on it
- Other builders skip claimed ghosts to avoid wasted effort

**Example:**
```typescript
// In builder brain logic
const context = world.runBehaviorContext;
const searchRadius = baseRadius + context.buildRadiusBonus;

// Find nearest ghost within radius
const ghost = findNearestGhost(position, searchRadius);

if (context.avoidDuplicateGhostTargets) {
  // Check if ghost is already claimed by another builder
  if (ghost.claimedBy && ghost.claimedBy !== droneId) {
    continue; // Skip this ghost
  }
  ghost.claimedBy = droneId; // Claim it
}
```

### 3. Emergency Cooling Protocol
**Effects:**
- `heatCriticalRoutingBoost: true`
- `heatCriticalThresholdRatio: 0.9`
- `coolerPriorityOverride: 0` (highest priority)

**Integration Points:**
- `DemandPlanningSystem` or priority calculation system
- Monitor heat ratio (current / safe cap)
- When heat exceeds `heatCriticalThresholdRatio`, override all task priorities
- Set cooler/heat sink tasks to `coolerPriorityOverride` (0 = highest priority)

**Example:**
```typescript
// In demand planning system
const context = world.runBehaviorContext;
const heatRatio = world.globals.heatCurrent / world.globals.heatSafeCap;

if (context.heatCriticalRoutingBoost && heatRatio > context.heatCriticalThresholdRatio) {
  // Override priorities for cooling-related tasks
  coolingTasks.forEach(task => {
    task.priority = context.coolerPriorityOverride || 0;
  });
}
```

### 4. Cannibalize & Reforge
**Effects:**
- `refundToFabricator: true`
- `refundComponentsFraction: 0.5`
- `postForkRebuildBoost: true`

**Integration Points:**
- `scrapEntity` action in `runSlice`
- When scrapping buildings/drones, calculate refund amount
- If `refundToFabricator` is true, add `cost * refundComponentsFraction` to Fabricator inventory
- `postForkRebuildBoost` could grant temporary production bonus after fork

**Example:**
```typescript
// In scrapEntity function
const context = state.runBehaviorContext;

if (context.refundToFabricator) {
  const refundAmount = Math.floor(scrapValue * context.refundComponentsFraction);
  
  // Find fabricator entity
  const fabricatorId = findFabricator(world);
  if (fabricatorId && world.inventory[fabricatorId]) {
    world.inventory[fabricatorId].Components += refundAmount;
  }
}
```

### 5. Priority Surge
**Effects:**
- `overrideTaskPrioritiesDuringOverclock: true`
- `overclockPrimaryTargets: ["Fabricator", "CoreCompiler"]`
- `overclockNonPrimaryPenalty: 1000`

**Integration Points:**
- `DemandPlanningSystem` and `DroneAssignmentSystem`
- When overclock is enabled (`world.globals.overclockEnabled`), check this module
- Boost priority of tasks targeting buildings in `overclockPrimaryTargets`
- Add penalty to non-primary targets

**Example:**
```typescript
// In task priority calculation during overclock
const context = world.runBehaviorContext;

if (world.globals.overclockEnabled && context.overrideTaskPrioritiesDuringOverclock) {
  const targetBuilding = world.entityType[task.targetEntityId];
  
  if (context.overclockPrimaryTargets.includes(targetBuilding)) {
    task.priority = 0; // Highest priority
  } else {
    task.priority += context.overclockNonPrimaryPenalty; // Penalize non-priority
  }
}
```

## Accessing RunBehaviorContext

The `RunBehaviorContext` is stored in the Zustand store's `runSlice`:

```typescript
// In React components:
const context = useGameStore((s) => s.runBehaviorContext);

// In ECS systems (if world has reference):
const context = world.runBehaviorContext; // If stored in world globals

// Or pass it to systems:
function updateDroneAssignmentSystem(world: World, context: RunBehaviorContext) {
  // Use context to modify behavior
}
```

## Implementation Status

✅ **Implemented:**
- JSON data definitions for all 5 modules
- TypeScript types and interfaces
- State management in `runSlice`
- UI panel for purchasing modules
- Tests verifying context updates

⚠️ **To Be Implemented:**
The actual wiring into simulation systems is left as a future enhancement. The behavior context is available and can be read by any system, but the systems need to be updated to check and respond to these flags.

## Testing Module Effects

To test if modules work in actual gameplay:
1. Start a run and reach Phase 2
2. Sacrifice drones via Fork Process to earn fork points
3. Open Fork Modules panel (purple button appears when you have 1+ FP)
4. Purchase modules and observe behavior changes
5. Use browser console to inspect `useGameStore.getState().runBehaviorContext`

## Future Work

Priority order for wiring effects:
1. **Predictive Hauler** - Most impactful for mid-game logistics
2. **Builder Swarm Instinct** - Visible improvement in construction speed
3. **Emergency Cooling Protocol** - Prevents late-game thermal collapse
4. **Priority Surge** - Overclock optimization for prestige runs
5. **Cannibalize & Reforge** - Economic benefit for aggressive playstyles
