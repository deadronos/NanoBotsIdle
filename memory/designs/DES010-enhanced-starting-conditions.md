# DES010 - Enhanced Starting Conditions

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #10

## Motivation / Summary
Apply meta upgrades to create meaningful variety in starting conditions across runs so prestige feels impactful.

## Requirements (EARS-style)
- WHEN a run is created, THE SYSTEM SHALL apply meta upgrades (starting radius, extractor tier, starting drones, passive cooling) to the new world [Acceptance: createWorld produces entities consistent with meta].

## High-level design
- createWorld reads `meta` slice and applies starting radius, starting inventory and specialist drone counts.
- Effects are deterministic and testable.

## Acceptance Criteria
- Run 2 feels noticeably faster than Run 1 (measurable in simulated test)
- Each tree provides distinct benefits
- Starting conditions scale appropriately across runs

## Implementation tasks
- [ ] Extend createWorld parameters to accept meta upgrades
- [ ] Add tests validating starting entity set for sample meta configs
- [ ] Document upgrade interaction rules

## Notes / Risks
- Ensure changes remain backward-compatible with save schema.
