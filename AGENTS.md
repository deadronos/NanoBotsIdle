# AGENTS.md

NanoBotsIdle: a voxel-based idle mining prototype — React 19, React Three Fiber, Zustand, Vite, TypeScript, npm with `package-lock.json`.

## Start here

1. `.github/copilot-instructions.md` — canonical architecture and conventions; read first.
2. `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE/` (`TECH###`, `GAME###`, `DEC###`) — why the code is shaped this way.
3. The `docs/agents/` guide matching your task — not the whole folder.

## Commands

| Command             | Purpose         |
| ------------------- | --------------- |
| `npm ci`            | locked install  |
| `npm run dev`       | Vite dev server |
| `npm run typecheck` | `tsc --noEmit`  |
| `npm run lint`      | ESLint          |
| `npm test`          | Vitest run      |

Full script list: `package.json`.

## Hard rules

- `.github/copilot-instructions.md` is the canonical source; this file only routes.
- Match an existing `src/` pattern; keep diffs surgical.
- No allocations in `useFrame()`; reuse `Vector3`/`Matrix4` via `useRef`/`useMemo`.
- A new upgrade touches `src/store.ts`, `getUpgradeCost()`, `ShopModal`, and its consumer.
- No hardcoded secrets (Vite `loadEnv`); no CDN/importmap runtime deps.
- Green before PR: `npm run typecheck`, `npm run lint`, `npm test`; log non-trivial work in `memory/`.

## Task guides (`docs/agents/`)

| File                                                             | Open when…                                 | Carries                                                        |
| ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| [development-workflow.md](docs/agents/development-workflow.md)   | any non-trivial task                       | 6-phase loop, TDD, artifact placement, merge checklist         |
| [git-workflow.md](docs/agents/git-workflow.md)                   | branches, commits, PRs                     | branch naming, Conventional Commits, PR checklist, squashing   |
| [typescript.md](docs/agents/typescript.md)                       | writing or reviewing TS                    | strict, boundary types, `import type`, `@/*` alias             |
| [react.md](docs/agents/react.md)                                 | components or hooks                        | function components, named exports, `React.FC` kept, hook deps |
| [testing.md](docs/agents/testing.md)                             | adding or changing tests                   | Vitest vs Playwright, 4 commands, `tests/*.test.ts(x)`         |
| [performance.md](docs/agents/performance.md)                     | render loop, voxels, chunks                | measure first, `npm run profile`, instancing/LOD               |
| [api-and-integrations.md](docs/agents/api-and-integrations.md)   | adding a dependency                        | zod at boundaries, `loadEnv`, retries, no CDN                  |
| [ci-cd.md](docs/agents/ci-cd.md)                                 | editing `.github/workflows/`               | 3 workflows, job order, concurrency, action pins               |
| [memory-bank.md](docs/agents/memory-bank.md)                     | resuming multi-session work                | 6 core files, `TASK###` statuses, `DESIGN###`, resume          |
| [markdown.md](docs/agents/markdown.md)                           | writing or editing docs                    | one H1, fence/heading rules, link don't copy                   |
| [code-review.md](docs/agents/code-review.md)                     | reviewing a PR                             | severity order, hot spots, blocking vs not, `file:line`        |
| [ai-prompt-engineering.md](docs/agents/ai-prompt-engineering.md) | writing prompts                            | no LLM runtime, untrusted input, no secrets, output contract   |
| [prompt-files.md](docs/agents/prompt-files.md)                   | editing `.github/prompts/` or `*.agent.md` | frontmatter, naming, tools, body order, stop condition         |
| [powershell.md](docs/agents/powershell.md)                       | only if adding `.ps1`                      | no `.ps1` today; full cmdlets, no `Write-Host`                 |
| [decisions.md](docs/agents/decisions.md)                         | a rule looks wrong or stale                | resolved decisions, superseded, cleanup candidates             |

## Decisions

- `docs/agents/decisions.md` — resolved decisions, append-only.
- Read it before "fixing" a rule that looks wrong.
