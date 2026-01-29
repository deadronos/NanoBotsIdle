# Contradictions & Resolutions

## Test runner inconsistency — RESOLVED

- Decision: Prefer **Vitest** as the canonical unit test runner for the repository.
- Action taken: Updated React instructions and testing docs to prefer Vitest and removed the contradictory Jest mention from the React testing section.

## React typing/style preference — RESOLVED

- Decision: Keep `React.FC` guidance in the React instructions.
- Action taken: Updated `docs/agents/react.md` to state `React.FC` is kept and to recommend documenting usage patterns to avoid typing surprises.

## E2E framework — RESOLVED

- Decision: Prefer **Playwright** as the canonical E2E tool for this repository.
- Action taken: Updated testing docs to mark Playwright as the default E2E tool and documented its role in CI.

4) Duplication of procedural guidance

- Decision: Consolidate canonical process into the Spec-Driven Workflow (`.github/instructions/spec-driven-workflow-v1.instructions.md`) and replace duplicated fragments in other instruction files with references.
- Planned action: Sweep instruction files to replace duplicated TDD and documentation fragments with links to the Spec-Driven Workflow; I can open a follow-up PR to make these edits.

If you want, I can now open a PR implementing the remaining consolidation changes (and remove the flagged vague lines). Confirm and I'll prepare the PR with all edits grouped and explained in the PR description.
