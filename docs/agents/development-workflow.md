Canonical long-form: `.github/instructions/spec-driven-workflow-v1.instructions.md`

# Development Workflow (spec-driven)

- Follow the 6-phase loop: **Analyze → Design → Implement → Validate → Reflect → Handoff**.
- For medium/large changes: requirements in `memory/requirements.md`, a short design in `memory/designs/`, work broken into `memory/tasks/`.
- Update memory files during the work; attach the design/requirements/validation artifacts to the PR.
- PRs include a short executive summary, changed files, validation steps, and links to memory entries.
- TDD detail (red → green → refactor) lives in the canonical file — do not restate it here.

## Acceptance checklist (minimal before merge)

- 2–5 testable requirements written
- Design doc linked in the PR (if non-trivial)
- A test per requirement
- Performance baseline if the change touches a hot path
- Decision record for non-trivial trade-offs (`docs/ARCHITECTURE/DEC###-*.md`)
