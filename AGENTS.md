# Agent guide (NanoBotsIdle)

This repo is a React + Vite + React Three Fiber game prototype ("Voxel Walker").
Use this file as the starting point for any agentic work (Copilot, automation, or subagents).

## Start here

- Read `.github/copilot-instructions.md` first. It is the repo-specific source of truth for architecture, performance constraints, and conventions.
- Look for additional repo guidance in `.github/`:
  - `.github/instructions/` (coding standards, testing, React, TypeScript, performance, etc.)
  - `.github/prompts/` (prompt templates)
  - `.github/workflows/` (CI expectations)

## When to use subagents

If a task is broad or uncertain, prefer delegating to a purpose-built subagent rather than guessing.
Subagents available in `.github/agents/` include (examples):

- Planning/research: `planning-subagent`, `Implementation Plan Generation Mode`, `specification`
- Implementation: `implement-subagent`, `software-engineer-agent-v1`, `Expert React Frontend Engineer`
- Review: `code-review-subagent`
- Debugging: `debug`
- Architecture/UX/RAI: `SE: Architect`, `SE: UX Designer`, `SE: Responsible AI`

Tip: Use `Conductor` when you want an orchestrated Plan → Implement → Review loop.

## Agent skills

Reusable “skills” live in:

- `skills/`
- `.github/skills/`

If a user request matches a skill area (performance, workers, dynamic res scaling, webapp testing), consult the relevant skill doc and follow its workflow.

## Memory Bank (project context)

Persistent project context and planning artifacts live in `memory/`:

- Designs: `memory/designs/` (archive to `memory/designs/COMPLETED/` when done)
- Tasks/implementation plans: `memory/tasks/` (archive to `memory/tasks/COMPLETED/` when done)

Use the Memory Bank instructions at `.github/instructions/memory-bank.instructions.md`.

## Workflow expectations

- Prefer small, surgical changes that match existing patterns.
- Keep `useFrame()` work allocation-free when possible (R3F performance).
- Validate changes with the repo scripts:
  - `npm run lint` / `npm run lint:fix`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
