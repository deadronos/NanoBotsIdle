Canonical long-form: `.github/instructions/markdown.instructions.md`

# Markdown & Docs

- One H1 per file; sentence-case headings.
- Blank line before and after every heading, list, and fence.
- Every fence carries a language (`bash`, `ts`, `json`); no bare fences.
- Link the authoritative source and state only this repo's delta. A duplicated rule is a review defect.
- Relative links resolve from repo root; every `docs/...` target must exist before you commit.
- Tables for command and reference lists; prose paragraphs stay at three sentences or fewer.

## Update triggers

- Command or feature change → `README.md`.
- Architecture decision → `docs/ARCHITECTURE/DEC###-*.md`.
- Task work → `memory/tasks/TASK###-*.md`.
- Rule that looks stale → `docs/agents/decisions.md`.

`npm run format` rewrites Markdown. Run it before committing; never hand-align tables.
