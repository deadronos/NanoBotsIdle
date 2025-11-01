# Agent Guidance for Contributors

This document provides guidance for AI agents and human contributors who are implementing code, features, or documentation in this repository. Follow this guide in addition to the project's `.github` instruction files — they contain the authoritative workflows and templates.

## Quick reference

- Read the repository-level guidance in `.github/copilot-instructions.md` early in your workflow. If you haven't considered it already, start there.

- For medium-to-high impact code or feature changes, follow the instructions in:
  - `.github/instructions/memory-bank.instructions.md`
  - `.github/instructions/spec-driven-workflow-v1.instructions.md`

These files describe the Memory Bank conventions and the Spec-Driven Workflow used by the project. They are required reading for design, planning, and task tracking.

## Index files for designs and tasks

Both `memory/designs/` and `memory/tasks/` MUST contain an `_index.md` file that lists the files in the folder grouped by status:

- IN PROGRESS
- PENDING
- COMPLETED
- ABANDONED

These `_index.md` files should be created if missing and updated every time a design or task file is created, modified, or has its status changed. For example, when a task file's status changes to `COMPLETED`, its listing should be moved to the `COMPLETED` section of `memory/tasks/_index.md`.

Keep `_index.md` entries concise: `- [TASK001] Short title - one-line summary` (or `DES001` for designs).

Having these index files makes it easy for reviewers and agents to find current work and to pick unique numeric IDs for new files.

## Memory Bank: where to store designs and tasks

This project uses a Memory Bank under the `memory/` folder to store design artifacts, implementation plans, and ongoing task tracking. Use these folders and file formats so others and automated agents can find and reuse your work.

- Designs:
  - Location: `memory/designs/` (may contain subfolders such as `COMPLETED/`).
  - File format: `DESNNN-title.md` where `NNN` is a 3-digit unique design number starting at `001` (e.g. `DES001-add-heat-system.md`).
  - Each design file should contain: short motivation, EARS-style requirements, high-level architecture, interfaces/data models, and an implementation task list or references to tasks in `memory/tasks/`.
  - If a design is finished, move or copy it to `memory/designs/COMPLETED/` and mark its status in the file header.

- Tasks / Implementation Plans:
  - Location: `memory/tasks/` (may contain subfolders such as `COMPLETED/`).
  - File format: `TASKNNN-title.md` where `NNN` is a 3-digit unique task number starting at `001` (e.g. `TASK001-implement-thermal-model.md`).
  - Each task file should follow the project's `memory/tasks` template: a status header, original request, thought process, step-by-step implementation plan, and a progress log.
  - Tasks should reference the design they implement (use the `DESNNN` filename) and include acceptance criteria so reviewers and automated checks can validate work.

### Numbering and uniqueness

- Numbers (the `NNN` in `DESNNN` and `TASKNNN`) must be unique across the `memory/designs` (and its subfolders) and `memory/tasks` (and its subfolders) respectively. Before creating a new file:
  1. Check existing files in the target folder and `COMPLETED/` subfolder for used numbers.
  2. Pick the smallest available 3-digit number (starting at `001`).
  3. Update any index file (for example `memory/tasks/_index.md`) if present.

### Minimum contents: design and task templates

Design (`DESNNN-title.md`) — minimum sections:

- Title and status (Draft/In Review/Approved/Completed)
- Short motivation and scope
- Requirements (EARS-style) — 2–5 testable requirements
- High-level design (components, data flow, diagrams or ASCII art)
- Public interfaces and data models (types, schemas)
- Acceptance criteria (how to verify)
- Implementation tasks (linked `TASKNNN` entries)

Task (`TASKNNN-title.md`) — minimum sections:

- Status, Added and Updated dates
- Original request / Link to design (`DESNNN`)
- Implementation plan (step-by-step)
- Tests and validation steps
- Progress log entries with dates

## When to use Spec-Driven Workflow

- Use the Spec-Driven Workflow (`.github/instructions/spec-driven-workflow-v1.instructions.md`) for any change that is medium or high risk/impact (feature additions, changes to simulation logic, balancing, public APIs, major UI changes).
- For small or trivial fixes (typos, small UI copy changes, minor refactors) you may skip the full design process but still update `memory/` where appropriate.

## Practical process (recommended)

1. Read `.github/copilot-instructions.md` and the two instruction files mentioned above.
2. Create a `DESNNN-*.md` design for non-trivial changes in `memory/designs/` following the Design template.
3. From the design produce one or more `TASKNNN-*.md` task files in `memory/tasks/` with clear acceptance criteria.
4. Use the task file as the single source of truth while implementing. Add progress log entries as you work. Update status and dates frequently.
5. When code changes are ready, create a focused branch and a PR. In the PR description include:
   - The `DESNNN` design reference and any relevant task `TASKNNN` references
   - 2–5 testable requirements and how they were validated
   - Commands to reproduce the change locally
6. After merge, mark tasks/designs as `Completed` and move files to `COMPLETED/` subfolders as appropriate.

## Reviews and automation

- Reviewers should verify that changes match the acceptance criteria in the linked `TASKNNN` and `DESNNN` files.
- CI / automation may depend on the `memory/` files — keep them accurate. If you add tests, update any relevant test configuration or `vitest.config.ts` as needed.

## Notes and tips

- Keep designs concise — focus on why and what, not implementation minutiae. Use the task files for step-by-step work.
- Use descriptive, kebab-case titles for filenames (lowercase with `-` separators).
- When in doubt, prefer creating a minimal `DESNNN` and a tiny `TASKNNN` PoC task rather than making untracked large changes.

## Contacts and further reading

- Start with: `.github/copilot-instructions.md`
- Memory Bank rules: `.github/instructions/memory-bank.instructions.md`
- Spec-driven workflow: `.github/instructions/spec-driven-workflow-v1.instructions.md`

---
Generated guidance — update as project conventions evolve.
