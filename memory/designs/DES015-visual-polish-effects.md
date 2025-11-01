# DES015 - Visual Polish & Effects

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #15

## Motivation / Summary
Add visual effects and motion polish to improve player feedback, including heat glows, drone trails, and construction animations.

## Requirements (EARS-style)
- WHEN a building is stressed, THE SYSTEM SHALL display heat glow and pulsing effects [Acceptance: visual test and screenshot diff].

## High-level design
- UI components and small effect utilities in `src/ui/effects`.
- Use CSS/Tailwind and canvas layering for performance.

## Acceptance Criteria
- Heat danger is immediately recognizable in UI
- Drone movement appears visually satisfying
- Overclock/meltdown visuals communicate urgency

## Implementation tasks
- [ ] Implement heat glow shader or CSS overlay
- [ ] Add drone trail rendering in canvas
- [ ] Implement construction animations and particle effects
- [ ] Add visual test snapshots for automated checks

## Notes / Risks
- Visuals must be efficient to avoid impacting simulation performance.
