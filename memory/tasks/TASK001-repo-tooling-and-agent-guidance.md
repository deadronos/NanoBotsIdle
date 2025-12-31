# TASK001 - Repo tooling and agent guidance

**Status:** Completed  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request

- Write comprehensive Copilot instructions.
- Remove `importmap` usage.
- Install Tailwind v4+ using the appropriate Vite plugin.
- Add `npm run lint:fix`.
- Add `AGENTS.md` with guidance about `.github/agents`, skills folders, and the Memory Bank.
- Standardize tests under `tests/` and configure Vitest accordingly.

## Implementation Notes

- Tailwind is configured via `@tailwindcss/vite` and `src/index.css` (`@import "tailwindcss";`).
- Tests live under `tests/` and Vitest is configured via `vite.config.ts`.
- Agent guidance lives in root `AGENTS.md`; Copilot guidance lives in `.github/copilot-instructions.md`.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
