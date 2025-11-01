# TASK021 - Statistics & Analytics

**Status:** Not Started

**Added:** 2025-11-01

## Original Request

Implement detailed statistics tracking and visualization for optimization gameplay and provide export options (JSON/CSV). See DES021.

## Thought Process

Players benefit from per-run summaries to analyze performance and tune strategies. Collect lightweight telemetry from key systems (CompileScoring, Production, Heat) and persist run summaries in `meta` so they survive restarts.

## Implementation Plan

- [ ] Add per-run telemetry hooks in CompileScoringSystem, ProductionSystem, and HeatSystem

- [ ] Design a compact run-summary schema (timestamps, key metrics, aggregated stats)

- [ ] Persist run summaries to `meta.runHistory` with migration-friendly version header

- [ ] Build a `StatsPanel` UI component that lists runs and shows basic graphs (throughput over time, compile shard rate, heat curve)

- [ ] Add export functionality for JSON and CSV per-run and for selected runs

- [ ] Add unit tests verifying exported JSON matches internal counters

## Progress Log


## Acceptance Criteria

- Per-run summaries are stored after run end and visible in the Stats UI

- Exported JSON/CSV matches internal counters and can be imported back (round-trip)

