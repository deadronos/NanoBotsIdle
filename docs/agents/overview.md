# Agents — Overview

One-line project description: NanoBotsIdle — a small voxel-based idle mining game prototype built with React + React Three Fiber.

Package manager: **npm** (see `package.json` / `package-lock.json`).

Key commands you should know (non-standard or commonly used):

- npm install
- npm run dev
- npm run build
- npm run preview
- npm test
- npm run test:watch
- npm run test:coverage
- npm run typecheck (tsc --noEmit)
- npm run lint
- npm run format
- npm run profile / npm run profile:baseline

Core docs to read for almost any task:

- .github/copilot-instructions.md — project-specific architecture & conventions
- .github/instructions/spec-driven-workflow-v1.instructions.md — the required workflow (Analyze → Design → Implement → Validate → Reflect → Handoff)
- .github/instructions/memory-bank.instructions.md — where to add/read tasks, designs, and active context

Essential rules (apply to every task):

- Keep changes small and test-backed (TDD where practical).
- Update the Memory Bank (`/memory`) for new tasks, designs, or decisions.
- Follow pre-existing patterns in the codebase (see `docs/ARCHITECTURE.md` and `src/`).
