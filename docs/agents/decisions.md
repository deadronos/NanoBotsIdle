# Decisions & Cleanup Candidates

Statuses: RESOLVED | OPEN | SUPERSEDED. Append-only. No proposals, no "I can…".

## Resolved

| Decision | Status | Where it lives |
| --- | --- | --- |
| Vitest is the unit test runner | RESOLVED | `testing.md`, `package.json` |
| Playwright is the E2E/browser tool | RESOLVED | `testing.md` |
| `React.FC` stays (33 usages in `src/`) | RESOLVED | `react.md` |
| One procedural source: `spec-driven-workflow-v1` | RESOLVED | `development-workflow.md` |
| TypeScript 6.x, `target: esnext`, `strict: true` | RESOLVED | `typescript.md`, `package.json`, `tsconfig.json` |

## Superseded by this PR (2026-11-02, `docs: progressive-disclosure AGENTS.md`)

- AGENTS.md flat 15-item list → 3-column pointer table with "open when…" hints.
- `overview.md` → retired; content lives in `AGENTS.md` and `development-workflow.md`.
- `contradictions.md` + `flags-for-deletion.md` → merged into this file.
- `typescript.md` "TypeScript 5.x, compile to ES2022" → TS 6.x (`^6.0.3`), `target: esnext` per `tsconfig.json`.
- "I can open a PR…" offers → removed; each entry now has a status and a destination.
- `testing.md` "Status: Resolved" footer → removed, duplicated this file.

Retired filenames, kept here as plain text so the reverse link check stays clean: `overview.md`, `contradictions.md`, `flags-for-deletion.md`.

## Cleanup candidates (nothing deleted in this PR)

| Item | Why | Action |
| --- | --- | --- |
| Generic "write clean code" lines in `.github/instructions/*` | non-actionable | flag only — instructions stay (referenced from 4 places) |
| Broad "follow React's official style guide" statements without repo-specific rules | too vague to act on | flag only — `react.md` carries this repo's deltas |
| "Document `React.FC` usage patterns rather than deleting" note | dropping the guidance would lose typing advice | closed by `react.md` §Export style; nothing deleted |
| `memory/design/` (2 ad-hoc files) | duplicates `memory/designs/` | flag; migrate on next design task |
| `powershell.md` | no `.ps1` in repo | keep, scoped; delete if still unused in 6 months |
| `.github/ALIGN-INSTRUCTIONS.md` | historical changelog, reads as current | flag; add a "historical" banner in a follow-up |
| `ci.yml` triggers + Node 18 pin | `workflow_dispatch` only; lockfile needs Node ≥20.19 | separate CI PR, not a docs change |
