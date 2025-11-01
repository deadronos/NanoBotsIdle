# DES012 - Fork Behavior Modules

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #12

## Motivation / Summary
Create behavior modules that modify drone AI and system priorities for run customization during Fork.

## Requirements (EARS-style)
- WHEN a player purchases a behavior module during a Fork, THE SYSTEM SHALL apply module effects to run-local behavior defaults and drone brains [Acceptance: unit tests for module application].

## High-level design
- Module definitions stored in JSON (`data/fork-modules/*.json`)
- Runtime: a module registry that maps module IDs to code/config effects (priority weights, prefetch flags, builder radius)

## Acceptance Criteria
- All listed modules defined in JSON
- Modules affect drone behavior visibly and are purchasable during fork

## Implementation tasks
- [ ] Define JSON schema and sample modules
- [ ] Implement module registry and apply logic
- [ ] Add UI for buying modules in Fork modal
- [ ] Tests to validate behavior changes

## Notes / Risks
- Module side-effects must be reversible on run reset; keep run-local only.
