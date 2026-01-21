# React (summary)

Core actionable points from `.github/instructions/reactjs.instructions.md`:

- Use functional components and hooks; prefer composition over inheritance.
- Use TypeScript types for props, state; prefer explicit types at public boundaries.
- Use `useEffect` with correct deps and cleanups; use `useMemo` / `useCallback` judiciously.
- Use `React.memo` for memoization when appropriate.

Notes & decision points:

- The instructions mention `React.FC`. This repository will **keep** `React.FC` guidance; document recommended usage to avoid mixed styles or typing surprises.
- Unit tests: **Vitest** is the project's unit test runner. E2E tests default to **Playwright** as the canonical browser automation tool.
