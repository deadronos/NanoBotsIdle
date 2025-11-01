# TASK008 - Compile Shard System

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement prestige currency calculation and flow with real-time shard projection. See Issue #8.

## Thought Process
Compute metrics (peakThroughput, cohesionScore, stressSeconds) incrementally in a deterministic CompileScoringSystem and expose projection via uiSnapshot.

## Implementation Plan
- [ ] Implement metric collectors in CompileScoringSystem
- [ ] Wire into uiSnapshot and TopBar projection
- [ ] Implement prestige screen and reset logic
- [ ] Add unit tests for formula and projection

## Progress Log


## Acceptance Criteria
- Shard calculation matches design spec
- Players see projected shards in real-time
- Prestige resets run state but keeps meta state
- Breakdown shows contribution of each factor

