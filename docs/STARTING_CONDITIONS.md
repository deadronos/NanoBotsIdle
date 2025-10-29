# Starting Conditions with Meta Upgrades

This document describes how meta upgrades from the prestige system affect starting conditions for new runs.

## Implemented Starting Conditions

All meta upgrades are properly applied when creating a new world via the `createWorld()` function in `src/ecs/world/createWorld.ts`.

### Bio Structure Upgrades

1. **Starting Extractor Tier** (`startingExtractorTier`)
   - Applied to the initial Extractor building (line 133)
   - Higher tier = faster production from the start
   - Heat generation scales with tier (line 137)
   
2. **Passive Cooling Bonus** (`passiveCoolingBonus`)
   - Increases global heat capacity: `100 + bonus * 20` (line 79)
   - Adds cooling to Core when > 0: `0.2 * bonus` per second (line 119)
   - Allows running hotter factories without efficiency loss

3. **Starting Core Inventory** (`startingCoreInventory`)
   - Adds extra resources (Components, TissueMass) to Core at start (line 113)
   - Allows building more structures immediately
   - **Fixed in Issue #10**: Now properly applies on top of base starting resources

### Swarm Cognition Upgrades

1. **Starting Specialists** (`startingSpecialists`)
   - Spawns additional specialist drones at game start (lines 199-229)
   - Types: hauler, builder, maintainer
   - Base count: 1 hauler, 1 builder, 0 maintainers
   - Bonus drones added on top of base count

2. **Build Radius Enhancement**
   - Builder specialists increase base build radius (line 35)
   - Base behavior gets: `buildRadius: 5 + startingSpecialists.builder`
   - Individual builders get +2 more on top (line 215)

### Compiler Optimization Upgrades

These affect runtime gameplay rather than initial world state:
- `compileYieldMult`: Multiplies final shard payout
- `overclockEfficiencyBonus`: Reduces heat multiplier during overclock
- `recycleBonus`: Increases shards from scrapping/self-termination
- `startingForkPoints`: Grants fork points at the start of a run

## Not Currently Implemented

### Starting Radius (`startingRadius`)

The `bioStructure.startingRadius` field exists in the meta upgrades interface but is **not currently used** in the game.

**Original Intent** (from design docs):
- Expand the initial buildable area around the Core
- Allow placing buildings further from Core at the start of later runs

**Current Status**:
- Field defined in `metaSlice.ts` with default value of 4
- No placement radius restrictions currently implemented in the game
- Players can build anywhere on the 64x64 grid
- No UI or system to enforce or visualize a placement radius

**Why Not Implemented**:
- Would require significant new systems:
  - Placement validation based on distance from Core
  - Visual indicators for buildable/non-buildable areas
  - UI feedback when trying to place outside radius
- The `buildRadius` system (for drone building range) already exists and works
- Following "minimal changes" principle for this issue

**Future Consideration**:
If placement radius restrictions become a gameplay requirement, the `startingRadius` field is already in place and can be integrated with a new placement validation system.

## Testing

Comprehensive tests are available in `src/test/startingConditions.test.ts`:
- Verifies each meta upgrade is properly applied
- Tests progression from Run 1 to Run 2
- Validates that each upgrade tree provides distinct benefits

## Progression Validation

The acceptance criteria from Issue #10 are met:

✅ **Run 2 feels noticeably faster than Run 1**
- More starting drones (logistics & building)
- Higher tier extractors (production)
- More starting resources (Components, TissueMass)
- Higher heat capacity (can push harder)

✅ **Each tree provides distinct benefits**
- Swarm: More drones, better AI, faster logistics
- Bio: Better infrastructure, higher tiers, more heat capacity
- Compiler: Better rewards and efficiency (runtime bonuses)

✅ **Starting conditions scale appropriately**
- All bonuses are additive or multiplicative
- No breaking changes to balance
- Tests verify scaling across multiple upgrade levels

✅ **Players reach Phase 3 faster in later runs**
- More resources = faster building
- Better production = faster progression
- More drones = more parallelism
