# Git & PR Workflow

Recommended conventions for branches, commits, and PRs used by agents and humans:

Branch names
- Use `type/short-description` (e.g., `feature/T123-add-shop-modal`, `fix/T456-drones-crash`).

Commit messages
- Follow **Conventional Commits** where practical (e.g., `feat: add upgrade shop modal`).
- Tie commits to issue/TASK IDs in the PR or commit message when useful.

PR checklist (minimal before requesting review)
- [ ] Tests added/updated for new behavior
- [ ] Relevant docs/memory bank updated (task, design, decisions)
- [ ] CI passes (typecheck, lint, tests)
- [ ] Short PR description + 1-line goal + validation steps

Merging
- Prefer squash merges for concise history unless preserving granular commits is necessary.
- Protect `main` – require passing CI and at least one reviewer.

Note: the Spec-Driven Workflow requires an executive summary in PRs for larger changes. See `docs/agents/development-workflow.md` and `.github/instructions/spec-driven-workflow-v1.instructions.md`.
