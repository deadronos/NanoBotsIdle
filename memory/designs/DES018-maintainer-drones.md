# DES018 - Maintainer Drones

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #18

## Motivation / Summary
Implement a third specialized drone role (Maintainer) for late-game complexity and to service building degradation or maintenance jobs.

## Requirements (EARS-style)
- WHEN Maintainer drones exist, THE SYSTEM SHALL assign them to maintenance tasks and reduce failure rates for buildings [Acceptance: simulation of degradation shows maintenance effectiveness].

## High-level design
- New drone role: Maintainer; task queue entries for maintenance jobs; optional building degradation system.

## Acceptance Criteria
- Maintainers have clear purpose and provide measurable late-game benefits
- Players can acquire Maintainers via meta upgrades

## Implementation tasks
- [ ] Implement Maintainer role and task assignment
- [ ] Implement optional building degradation mechanic
- [ ] Add UI to show maintenance queues

## Notes / Risks
- Degradation adds complexity to balancing; consider optional toggle or late-game gating.
