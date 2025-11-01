# DES009 - Meta Upgrade Trees

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #9

## Motivation / Summary
Implement three data-driven upgrade trees (Swarm Cognition, Bio-Structure, Compiler Optimization) to drive long-term progression.

## Requirements (EARS-style)
- WHEN the player spends compile shards, THE SYSTEM SHALL unlock persistent upgrades that affect next runs (starting drones, cooling bonus, yield multipliers) [Acceptance: JSON data defines upgrade effects and unit tests apply effects to createWorld].

## High-level design
- Data files: `data/meta-upgrades/*.json` with tree definitions and costs
- UI: Meta upgrade panels to buy upgrades and show costs/effects
- Integration: createWorld reads meta to seed next run

## Acceptance Criteria
- All 12 meta upgrades defined in JSON
- Players can spend shards and upgrades affect next run immediately
- UI shows locked/available/purchased states

## Implementation tasks
- [ ] Define JSON schema for upgrades
- [ ] Implement upgrade store in `useGameStore` meta slice
- [ ] Add meta UI and wiring to createWorld
- [ ] Add tests for upgrade persistence and effect application

## Notes / Risks
- Migration required for upgrades in existing saves; keep schema versioned.
