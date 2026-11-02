Canonical long-form: `.github/instructions/code-review-generic.instructions.md`

# Code Review

The canonical file's "Project Context" already sets the stack (React 19, R3F, Zustand, Vite). Use this file for what to check first in this repo.

## Priority order

1. Correctness and economy exploits (negative costs, unbounded prestige multipliers).
2. Data loss — save-version migration (`docs/ARCHITECTURE/TECH004-save-migration-framework.md`).
3. Performance regressions in the render/sim loop.
4. Style — Prettier's job; never block on it.

## Hot spots to inspect by default

- `useFrame()` bodies: allocations, per-frame array scans, `setState` per frame.
- Chunk/meshing and LOD cache invalidation in `src/components/world/`.
- `src/store.ts`: `getUpgradeCost()` curve, prestige multiplier, save shape.
- Worker ↔ main-thread serialization (structured-clone size, per-frame messages).
- Save-version migration paths.

## Blocking vs not

- Blocking: red `npm run typecheck` / `npm run lint` / `npm test`; new `any` at a module boundary; unbounded per-frame loop; hardcoded secret; behavior change without a test.
- Non-blocking: naming, comment density, formatting, refactors outside the diff.

## Comment format

Use `CRITICAL | IMPORTANT | SUGGESTION`, then `file:line`, then a concrete fix snippet. No "consider…" comments.

A hot-path change needs a profile run (`npm run profile`) or a before/after number. Review the diff, not the file, and do not re-litigate items settled in `decisions.md`.
