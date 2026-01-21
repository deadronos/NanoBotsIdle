# TypeScript: Key Conventions

Summary of the most actionable, repo-relevant TypeScript rules (derived from `.github/instructions`):

- Target: TypeScript 5.x, compile to ES2022.
- Types at boundaries: prefer **explicit types** for public APIs, props, and public helpers.
- Avoid `any`; prefer `unknown` + narrowing. Use discriminated unions for state/events.
- Keep functions short and single responsibility; extract testable helpers.
- Naming: PascalCase for classes/interfaces/enums; camelCase for variables/functions.
- Import types with `import type` when appropriate.
- Use `tsc --noEmit` (npm run typecheck) in CI and locally before PRs.
- Document public APIs with JSDoc (include `@example` / `@remarks` when helpful).
- Guard edge cases early and surface meaningful errors.

Performance/security notes:

- Avoid allocations in hot paths (e.g., `useFrame` in R3F). Cache objects in `useRef`.
- Never hardcode secrets; validate and sanitize external inputs.

When in doubt: follow existing patterns in `src/` and add tests for new behaviors.
