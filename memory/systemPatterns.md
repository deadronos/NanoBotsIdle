# System Patterns

## Architecture

- ECS (Entity Component System) separates data (components) from logic (systems). Systems operate on queries of entities with specific components.
- Simulation runs in a headless tick loop decoupled from React rendering. UI reads snapshots of the simulation state.

## Key design patterns

- Immutable snapshots for UI rendering: systems produce read-only snapshots to avoid React churn.
- Message/event queue for cross-system communication (non-blocking, batched per tick).
- Component versioning / migration support in save/load system.

## Testing patterns

- Keep simulation deterministic for unit tests when possible (fixed RNG seeds, deterministic scheduling).
- Unit-test balance functions separately from full simulation integration tests.

## Extension guidelines

- New building types: add a TypeScript type in `src/types/buildings.ts`, component interfaces, and system logic. Provide design doc entry in `memory/designs/` and a task in `memory/tasks/`.