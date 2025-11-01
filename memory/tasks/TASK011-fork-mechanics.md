# TASK011 - Fork Mechanics

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement intra-run mini-prestige system where players sacrifice drones for Fork Points to buy behavior modules. See Issue #11.

## Thought Process
Make Fork an atomic action in the sim: compute value, remove drones, credit points, open modal to spend points, then spawn new drones.

## Implementation Plan
- [ ] Implement fork calculator and action
- [ ] Build Fork modal with module shop
- [ ] Wire respawn logic and behavior assignment
- [ ] Add tests for fork atomicity and point calculations

## Progress Log


## Acceptance Criteria
- Players can trigger Fork after Phase 1
- Fork grants proportional Fork Points
- New drones spawn with enhanced behaviors

