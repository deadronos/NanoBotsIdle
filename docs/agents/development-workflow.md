# Development Workflow (spec-driven)

Quick summary of the repo's required workflow (see `.github/instructions/spec-driven-workflow-v1.instructions.md` for full details):

- Follow the 6-phase loop: **Analyze → Design → Implement → Validate → Reflect → Handoff**.
- Follow the Spec-Driven Workflow for process and TDD details (see `.github/instructions/spec-driven-workflow-v1.instructions.md`).
- For medium/large changes: add requirements in `memory/requirements.md`, a short design in `memory/designs/`, and break work into `memory/tasks/`.
- Update memory files during the work and attach the design/requirements/validation artifacts to the PR.
- PRs should include a short executive summary, changed files, validation steps, and links to memory entries.

Acceptance checklist (minimal before merge):
- 2–5 testable requirements written
- Design doc linked in PR (if non-trivial)
- Tests for each requirement
- Performance baseline if applicable
- Decision records for non-trivial trade-offs
