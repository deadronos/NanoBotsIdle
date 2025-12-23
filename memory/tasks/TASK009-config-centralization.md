# [TASK009] - Config centralization under /src/config

**Status:** In Progress  
**Added:** 2025-12-23  
**Updated:** 2025-12-23

## Original Request

Expose nearly every somewhat configurable parameter in appropriate files in a `/src/config` folder.

## Thought Process

- Centralize tuning constants without changing runtime behavior.
- Keep config modules side-effect free and grouped by domain.
- Avoid circular dependencies by keeping config modules independent of runtime logic.

## Implementation Plan

1. Create `/src/config` modules for atlas, world, simulation, gameplay, player, rendering, perf, ECS, and particles.
2. Replace inline constants in runtime files with config imports.
3. Update Memory Bank docs (requirements + design) and baseline notes.
4. Run `npm run build` to validate.

## Progress Tracking

**Overall Status:** In Progress - 10%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Draft design and requirements for config centralization | Complete | 2025-12-23 | DESIGN008 + requirements updated |
| 1.2 | Create config modules | Not Started | 2025-12-23 |  |
| 1.3 | Wire config imports across runtime files | Not Started | 2025-12-23 |  |
| 1.4 | Validate build + update docs | Not Started | 2025-12-23 |  |

## Progress Log

### 2025-12-23

- Drafted DESIGN008 and added planned requirements for config centralization.
