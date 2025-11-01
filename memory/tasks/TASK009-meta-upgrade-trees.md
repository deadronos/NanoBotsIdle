# TASK009 - Meta Upgrade Trees

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement three data-driven upgrade trees with JSON definitions and UI. See Issue #9.

## Thought Process
Define a JSON schema for upgrades and a small upgrade engine in the meta slice that can apply effects to createWorld.

## Implementation Plan
- [ ] Create JSON schema and sample files for each tree
- [ ] Implement meta store and spendShards action
- [ ] Wire into createWorld to apply persistent upgrades
- [ ] Add UI panels and tests

## Progress Log


## Acceptance Criteria
- All 12 meta upgrades defined in JSON
- Players can spend shards on upgrades
- Upgrades affect next run immediately

