# DESIGN008 - Config centralization under /src/config

**Status:** Proposed  
**Added:** 2025-12-23  
**Author:** Codex (GPT-5)

---

## Summary

Centralize runtime-tunable constants into `/src/config` so gameplay, rendering, ECS, world generation, and performance budgets are defined in one place. This reduces scattered magic numbers, makes tuning safer, and provides a stable surface for future systems.

## Motivation and Goals

- Make behavior/tuning changes explicit and discoverable.
- Prevent divergence between atlas/meshing/UI tile constants.
- Provide a single location for performance and simulation knobs.
- Keep behavior stable (only wiring changes) unless explicitly adjusted.

---

## Requirements (EARS-style)

1. WHEN a configurable parameter is used by multiple subsystems, THE SYSTEM SHALL define it once in `/src/config` and import it from there.
   **Acceptance:** tiles-per-row and atlas tile size are shared by atlas, meshing, and UI.

2. WHEN core gameplay or simulation constants are updated, THE SYSTEM SHALL reflect those changes through config modules without additional code edits.
   **Acceptance:** fixed-step, mining cadence, and pick distance are sourced from config.

3. WHEN performance budgets are adjusted, THE SYSTEM SHALL apply the changes through config without altering logic flow.
   **Acceptance:** background scheduler budget and per-frame caps are sourced from config.

---

## Proposed config modules

- `config/atlas.ts` - `TILES_PER_ROW`, `TILE_PX`
- `config/world.ts` - world seed, view distance, chunk size, generation overrides
- `config/simulation.ts` - fixed-step seconds, max steps, max frame delta, day length
- `config/gameplay.ts` - pick distance, mining hit interval
- `config/player.ts` - gravity, walk/sprint/jump, friction/air control, collider
- `config/rendering.ts` - camera/gl settings, sky settings, fog, highlight colors
- `config/perf.ts` - background scheduler budget, max per-frame caps
- `config/ecs.ts` - lighting config + mob spawn config defaults
- `config/particles.ts` - particle size, opacity, gravity, max particles

---

## Interfaces

```ts
export const SIMULATION = {
  fixedStepSeconds: 1 / 60,
  maxSimSteps: 5,
  maxFrameDelta: 0.1,
  dayLengthSeconds: 140,
};
```

Config exports are plain objects or constants with no side effects.

---

## Non-goals

- No runtime UI to edit configs.
- No dynamic config loading or persistence.

---

## Implementation plan

1. Create `/src/config` modules and export constants.
2. Replace magic numbers in runtime files with config imports.
3. Update docs (`README`, `memory/perf-baselines.md`) to note the new config surface.
4. Run `npm run build` to ensure type safety.

---

**Next step:** implement the config modules and wire imports without changing behavior.
