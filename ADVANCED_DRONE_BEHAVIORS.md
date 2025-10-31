# Advanced Drone Behaviors Implementation

This document describes the implementation of advanced drone behaviors (Issue #13, Milestone 3.3) that enable visible AI improvements from Fork modules across all drone systems, as well as the Maintainer drone role (Issue #18, Milestone 4.5).

## Overview

The advanced drone behaviors system enhances the base drone AI with five key capabilities:
1. **Prefetch/Low-Water-Mark Hauling**: Proactive resource delivery before starvation
2. **Builder Coordination**: Prevents duplicate construction work
3. **Heat-Critical Routing Override**: Emergency cooling prioritization
4. **Recycling/Refund Mechanics**: Resource recovery from scrapped buildings
5. **Overclock Priority Surge**: Focused logistics during high-throughput mode
6. **Maintainer Role** (NEW): Building maintenance to prevent efficiency degradation

## Drone Roles

The game features three specialized drone roles:

### Hauler Drones (🔵)
- **Primary Function**: Transport resources between buildings
- **Enhancements**: Prefetch hauling, priority routing, congestion avoidance
- **Visual**: Blue color (#60a5fa)

### Builder Drones (🟡)
- **Primary Function**: Construct ghost buildings and expansions
- **Enhancements**: Duplicate target avoidance, coordinated building
- **Visual**: Yellow color (#fbbf24)

### Maintainer Drones (🟢) - NEW
- **Primary Function**: Repair degraded buildings to restore efficiency
- **Mechanics**: Monitor wear, prioritize critical buildings, perform maintenance work
- **Visual**: Green color (#34d399)
- **See**: [MAINTAINER_DRONES.md](./MAINTAINER_DRONES.md) for full details

## Architecture

### System Integration

The behaviors are integrated into the ECS architecture through three main systems:

```
demandPlanningSystem → droneAssignmentSystem → movementSystem
         ↓                      ↓
   Task Creation          Task Assignment
   + Prioritization      + Coordination
```

### Component Structure

```typescript
// DroneBrain.ts - Behavior configuration
interface BehaviorProfile {
  priorityRules: RoutingPriorityRule[];
  prefetchCriticalInputs: boolean;           // Feature 1
  buildRadius: number;
  congestionAvoidance: number;
  avoidDuplicateGhostTargets?: boolean;      // Feature 2
}

// Recyclable.ts - Resource recovery
interface Recyclable {
  refundFraction: number;                     // Feature 4
  refundToFabricator: boolean;
  buildCost: Partial<Record<ResourceName, number>>;
}
```

### World State Extensions

```typescript
interface World {
  // ... existing components ...
  builderTargets: Record<EntityId, EntityId>; // Feature 2: Builder coordination
  recyclable?: Record<EntityId, Recyclable>;  // Feature 4: Recycling
}
```

## Feature Details

### 1. Prefetch/Low-Water-Mark Hauling

**Purpose**: Reduce production starvation by delivering resources before they run out.

**Implementation** (`demandPlanningSystem.ts`):
- Detects if any drone has `prefetchCriticalInputs: true`
- Uses `PREFETCH_LOW_WATER_THRESHOLD` (30%) instead of `NORMAL_LOW_WATER_THRESHOLD` (200%)
- Creates task requests when inventory ratio < low-water threshold
- Prevents idle time in production chains

**Configuration Constants**:
```typescript
const PREFETCH_LOW_WATER_THRESHOLD = 0.3; // 30% inventory threshold
const NORMAL_LOW_WATER_THRESHOLD = 2.0;   // 200% (backwards compat)
```

**Activation**:
```typescript
drone.behavior.prefetchCriticalInputs = true; // Enabled by Fork module
```

**Testing**:
- ✅ Creates tasks at 30% threshold with prefetch enabled
- ✅ No tasks when inventory is above low-water mark
- ✅ Works independently of other behaviors

### 2. Builder Coordination

**Purpose**: Prevent multiple builders from working on the same ghost structure.

**Implementation** (`droneAssignmentSystem.ts`):
- Maintains `world.builderTargets` map: `target entity → builder drone`
- Before assigning ghost building, checks if target is already claimed
- Reserves target when builder starts work
- Releases reservation when builder goes idle or completes work

**Activation**:
```typescript
drone.behavior.avoidDuplicateGhostTargets = true; // Enabled by Fork module
```

**Benefits**:
- Eliminates wasted effort on duplicate work
- Improves swarm efficiency with multiple builders
- Automatically handles target cleanup

**Testing**:
- ✅ Only one builder targets same ghost with coordination enabled
- ✅ Multiple builders can target same ghost when coordination disabled
- ✅ Target cleanup on completion

### 3. Heat-Critical Routing Override

**Purpose**: Extend survival time when factory approaches thermal failure.

**Implementation** (`demandPlanningSystem.ts`):
- Monitors heat ratio: `heatCurrent / heatSafeCap`
- When heat > `HEAT_CRITICAL_THRESHOLD` (90%), applies `HEAT_CRITICAL_PRIORITY_BOOST` (1000x) to Cooler tasks
- Forces haulers to prioritize cooling logistics above all else
- Tasks are sorted by priority, so critical tasks execute first

**Configuration Constants**:
```typescript
const HEAT_CRITICAL_THRESHOLD = 0.9;           // 90% of safe cap
const HEAT_CRITICAL_PRIORITY_BOOST = 1000;     // Priority multiplier
const NORMAL_TASK_PRIORITY = 1;                // Default priority
```

**Activation**:
Automatic when heat exceeds threshold (no configuration needed)

**Thresholds**:
- Normal priority: heat ≤ 90% of safe cap (priority = 1)
- Critical priority: heat > 90% of safe cap (priority = 1000)

**Testing**:
- ✅ Boosts cooler priority to 1000 when heat critical
- ✅ Normal priority when heat not critical
- ✅ Works with other priority modifiers

### 4. Recycling/Refund Mechanics

**Purpose**: Accelerate post-fork rebuild by recovering resources from scrapped buildings.

**Implementation** (`recyclingSystem.ts`):
- New `Recyclable` component stores build cost and refund settings
- `recycleEntity(world, entityId)` function calculates and returns resources
- Resources can go to Fabricator (for rebuild) or Core (for storage)
- Configurable refund fraction (e.g., 50% = half of build cost returned)

**Usage**:
```typescript
// Make building recyclable
world.recyclable[buildingId] = {
  refundFraction: 0.5,              // 50% refund
  refundToFabricator: true,         // Send to Fabricator
  buildCost: { Components: 10 }     // Original cost
};

// Recycle the building
const refund = recycleEntity(world, buildingId);
// Returns: { Components: 5 } and adds to Fabricator inventory
```

**Testing**:
- ✅ Refunds 50% of build cost to Fabricator
- ✅ Can refund to Core instead of Fabricator
- ✅ Removes entity components after recycling
- ✅ Returns null for non-recyclable entities

### 5. Overclock Priority Surge

**Purpose**: Maximize output during Phase 3 overclock by focusing all logistics on critical buildings.

**Implementation** (`demandPlanningSystem.ts`):
- Detects `world.globals.overclockEnabled`
- Applies `OVERCLOCK_CRITICAL_PRIORITY` (100) to Fabricator and CoreCompiler
- Applies `OVERCLOCK_NON_CRITICAL_PENALTY` (0.01) to all other buildings
- Effectively "tunnels" all hauler effort into high-value targets

**Configuration Constants**:
```typescript
const OVERCLOCK_CRITICAL_PRIORITY = 100;       // Priority for critical buildings
const OVERCLOCK_NON_CRITICAL_PENALTY = 0.01;   // Penalty for other buildings
```

**Activation**:
```typescript
world.globals.overclockEnabled = true; // Set when player activates overclock
```

**Priority Scaling**:
- Fabricator: 100x priority
- CoreCompiler: 100x priority
- All others: 0.01x priority (100x penalty)

**Trade-off**: 
Starves non-critical buildings but maximizes compile shard generation during overclock mode.

**Testing**:
- ✅ Prioritizes Fabricator and CoreCompiler (priority = 100)
- ✅ Penalizes non-critical buildings (priority = 0.01)
- ✅ Uses normal priorities when not overclocking

## Integration with Fork Modules

These behaviors are designed to be activated by Fork modules (Issue #12):

| Fork Module | Activates Behavior | Effect |
|-------------|-------------------|--------|
| Predictive Hauler | `prefetchCriticalInputs: true` | Prefetch hauling |
| Builder Swarm Instinct | `avoidDuplicateGhostTargets: true` | Builder coordination |
| Emergency Cooling Protocol | Automatic (heat threshold) | Heat-critical routing |
| Cannibalize & Reforge | `recyclable` component + refund | Recycling mechanics |
| Priority Surge | Automatic (overclock state) | Overclock priority surge |

## Performance Considerations

### Task Priority Sorting
- Tasks are sorted once per frame after all task requests are created
- Sorting uses JavaScript's native `Array.sort()` with simple numeric comparison
- O(n log n) complexity where n = number of task requests

### Builder Target Tracking
- `builderTargets` map has O(1) lookup and insertion
- Minimal memory overhead (only active builder assignments tracked)
- Automatic cleanup prevents memory leaks

### Recycling
- `recycleEntity()` is called manually (not automatic)
- O(1) component removal for each component type
- Resource transfer is O(1) per resource type

## Testing Coverage

**Test Suite**: `src/test/advancedDroneBehaviors.test.ts`

- ✅ 13 tests total
- ✅ 100% coverage of new behavior code paths
- ✅ Integration with existing systems verified
- ✅ Edge cases handled (null checks, empty inventories, etc.)

### Test Categories
1. **Prefetch Hauling**: 2 tests
2. **Heat-Critical Routing**: 2 tests
3. **Overclock Priority Surge**: 3 tests
4. **Builder Coordination**: 2 tests
5. **Recycling Mechanics**: 4 tests
6. **Maintainer Drones**: 18 tests (see `src/test/maintainerDrones.test.ts`)

## Maintainer Drone Behavior (Issue #18)

Maintainer drones represent the third specialized role, providing building maintenance to combat efficiency degradation. See [MAINTAINER_DRONES.md](./MAINTAINER_DRONES.md) for complete implementation details.

### Quick Summary

**Purpose**: Repair degraded buildings that lose efficiency over time

**Key Features**:
- Buildings accumulate wear based on activity, heat, and overclock status
- Wear reduces production efficiency (up to 30% penalty)
- Maintainers perform maintenance work to restore efficiency
- Priority system focuses on critical buildings (Fabricator, CoreCompiler)

**Integration**:
- `degradationSystem`: Accumulates wear on active buildings
- `maintenancePlanningSystem`: Creates maintenance requests
- `droneAssignmentSystem`: Assigns maintainers to buildings
- `movementSystem`: Executes maintenance work

**Balance**:
- Early game: Optional (slow degradation)
- Mid game: Useful (efficiency preservation)
- Late game: Essential (rapid wear under overclock)

## Future Enhancements

### Potential Improvements
1. **Adaptive Thresholds**: Make low-water-mark threshold configurable per building type
2. **Multi-Resource Routing**: Optimize routes that deliver multiple resource types
3. **Predictive Analytics**: Use historical consumption rates to predict starvation
4. **Builder Specialization**: Assign builders to specific construction zones
5. **Conditional Recycling**: Auto-recycle offline buildings after timeout

### Performance Optimizations
1. **Spatial Indexing**: Use quadtree for faster builder target queries
2. **Cached Priority Scores**: Pre-calculate priorities for common scenarios
3. **Batch Recycling**: Recycle multiple entities in single operation

## Related Files

### Implementation
- `src/ecs/systems/demandPlanningSystem.ts` - Task creation and prioritization
- `src/ecs/systems/droneAssignmentSystem.ts` - Task assignment and drone coordination (all roles)
- `src/ecs/systems/recyclingSystem.ts` - Resource recovery mechanics
- `src/ecs/systems/degradationSystem.ts` - Building wear accumulation (maintainers)
- `src/ecs/systems/maintenancePlanningSystem.ts` - Maintenance request creation (maintainers)
- `src/ecs/systems/movementSystem.ts` - Maintenance work execution (maintainers)
- `src/ecs/components/DroneBrain.ts` - Behavior configuration
- `src/ecs/components/Recyclable.ts` - Recyclable entity component
- `src/ecs/components/Degradable.ts` - Building degradation tracking (maintainers)
- `src/ecs/world/World.ts` - World state extensions

### Tests
- `src/test/advancedDroneBehaviors.test.ts` - Hauler/builder behavior test suite (13 tests)
- `src/test/maintainerDrones.test.ts` - Maintainer drone test suite (18 tests)

### Documentation
- `MAINTAINER_DRONES.md` - Comprehensive maintainer implementation guide

## Changelog

### v1.0.0 (2025-10-29)
- Initial implementation of all five advanced drone behaviors
- Full test coverage with 13 passing tests
- Integration with existing ECS systems
- Documentation complete
