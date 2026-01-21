# Agent Instructions (root)

**NanoBotsIdle —** a small voxel-based idle mining game prototype (React + React Three Fiber).

Quick essentials (root-level):

- Package manager: **npm** (use `npm install`, `package-lock.json`).
- Non-standard / important commands: `npm run typecheck`, `npm run profile`, `npm run test:lifecycle` (see `README.md` for the full list).
- For nearly every task, read these core docs first:
  - `.github/copilot-instructions.md` — project architecture & conventions
  - `.github/instructions/spec-driven-workflow-v1.instructions.md` — required workflow (Analyze → Design → Implement → Validate → Reflect → Handoff)
  - `.github/instructions/memory-bank.instructions.md` — where to record tasks, designs, and active context

Guides organized by topic (see `docs/agents/`):

- docs/agents/overview.md — project overview & essential commands
- docs/agents/development-workflow.md — Spec-driven workflow & PR checklist
- docs/agents/typescript.md — TypeScript conventions
- docs/agents/react.md — React conventions & decision points
- docs/agents/testing.md — testing patterns (Vitest + Playwright guidance)
- docs/agents/performance.md — performance & profiling guidance
- docs/agents/api-and-integrations.md — API & external integration best practices
- docs/agents/ci-cd.md — CI/CD (GitHub Actions) best practices
- docs/agents/memory-bank.md — how to use the Memory Bank for tasks & design
- docs/agents/markdown.md — documentation style & markdown guidance
- docs/agents/powershell.md — PowerShell scripting conventions
- docs/agents/code-review.md — code review priorities and checklist
- docs/agents/ai-prompt-engineering.md — AI prompt & safety guidance
- docs/agents/prompt-files.md — prompt file conventions
- docs/agents/git-workflow.md — branch/commit/PR conventions

Operational notes:

- I moved detailed/training instructions into `docs/agents/` so the root stays minimal. If you want me to move more docs or convert any `.github/instructions/*` into `docs/agents/` files, tell me which ones.
- Known contradictions and suggested deletions are listed in `docs/agents/contradictions.md` and `docs/agents/flags-for-deletion.md`.
