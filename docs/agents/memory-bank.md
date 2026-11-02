Canonical long-form: `.github/instructions/memory-bank.instructions.md`

# Memory Bank

Read the "Plan/Act" and "Task structure" sections of the canonical file; the rest restates generic memory-bank theory.

## Core files (all exist in `memory/`)

`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`, plus `requirements.md`.

## Tasks and designs

- Task file: `memory/tasks/TASK###-kebab-title.md`.
- Every task gets a row in `memory/tasks/_index.md` under exactly `In Progress | Pending | Completed | Abandoned`.
- Design doc: `memory/designs/DESIGN###-*.md`.
- `memory/design/` is legacy — do not add files there (see `decisions.md`).

## Resume protocol

1. `memory/tasks/_index.md` → pick the open task.
2. Latest `memory/activeContext.md`.
3. The `TASK###` file itself.

Before ending a session, append "where I stopped / next step" to `activeContext.md`.

## Rules

- Append, never rewrite history. Completed tasks stay.
- Non-trivial work (more than one file or ~30 minutes): requirements + design before code, per `development-workflow.md`.
- Don't paste code into memory; link paths and decisions (`docs/ARCHITECTURE/`).
