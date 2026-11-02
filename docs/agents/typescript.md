Canonical long-form: `.github/instructions/typescript-5-es2022.instructions.md` (filename is stale; this repo is TS 6 on `target: esnext` — see `package.json` and `tsconfig.json`)

# TypeScript

- Target: **TypeScript 6.x** (`^6.0.3`), `target: esnext`, `strict: true`, `moduleResolution: bundler`, `noEmit`.
- Types at boundaries: explicit types for public APIs, props, and exported helpers.
- Avoid `any`; prefer `unknown` + narrowing. Use discriminated unions for state and events.
- Import types with `import type`; path alias `@/*` maps to `./src/*`.
- Naming: PascalCase for classes/interfaces/enums; camelCase for variables and functions.
- Keep functions short and single responsibility; extract testable helpers.
- Guard edge cases early and surface meaningful errors.
- Document public APIs with JSDoc (`@example` / `@remarks` when helpful).
- `tsc --noEmit` (`npm run typecheck`) runs locally before every PR.

## Hot paths and secrets

- No allocations in hot paths (e.g. `useFrame` in R3F); cache objects in `useRef`.
- Never hardcode secrets; validate and sanitize external input.

When in doubt: follow existing patterns in `src/` and add a test for new behavior.
