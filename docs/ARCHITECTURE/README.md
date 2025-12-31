## Architecture Specs Index

This folder contains numbered specs and decisions that back the high-level
overview in `docs/ARCHITECTURE.md`.

The goal is to keep architectural intent explicit and resumable: if code work is
interrupted, updating or re-reading these docs should be enough to restart
implementation without rediscovering decisions.

## Document types

- `TECH###-*`: technical architecture specs (data flow, threading, storage).
- `GAME###-*`: gameplay specs (rules, progression, constraints).
- `DEC###-*`: decisions (ADR-style records for why we chose a direction).

## Specs

### Technical

- `TECH001-sim-render-separation.md`: main thread ↔ Worker separation, protocol,
  and tick scheduling rules.
- `TECH002-voxel-world-model.md`: true 3D voxel digging model (bedrock, edits,
  mineability/frontier, chunking).
- `TECH003-voxel-chunk-representation-and-render-adapters.md`: clarifies chunking
  vs storage vs rendering, and outlines modular performance optimizations.
- `TECH004-save-migration-framework.md`: versioned save schema with migration
  framework, validation, and sanitization.

### Gameplay

- `GAME001-progression-loop.md`: core loop (mine → upgrades → prestige), drone
  constraints, and soft-lock prevention rules.

### Decisions

- `DEC001-main-thread-player-collision.md`: keep player movement/collision on
  the main thread; mirror voxel edits for collision.
- `DEC002-worker-authoritative-engine.md`: keep canonical sim state in a Worker;
  main thread drives tick scheduling; no backlogs.
- `DEC003-procedural-base-plus-edits.md`: represent the voxel world as
  deterministic procedural base plus sparse edits overlay.
- `DEC004-render-visibility-driven-and-chunk-caches.md`: renderer draws a
  visibility set (frontier/surfaces) by default; dense chunk formats are caches,
  not the world source of truth.
- `DEC005-greedy-meshing-for-block-voxel-surfaces.md`: prefer greedy meshing as
  the first surface-meshing algorithm for block voxels; worker-friendly per-chunk jobs.
- `DEC006-noise-and-init-generation.md`: noise providers (`terrain.noiseType`), tuned OpenSimplex defaults, and prestige-time init retry strategy.

## Update rules

- If you change the architecture, update `docs/ARCHITECTURE.md` and the relevant
  `TECH/GAME/DEC` docs in this folder in the same PR.
- New designs and implementation plans live in `memory/designs/` and
  `memory/tasks/` and should reference the relevant `TECH/GAME/DEC` IDs.
