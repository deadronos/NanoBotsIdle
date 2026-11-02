Canonical long-form: `.github/copilot-instructions.md` (architecture and conventions); no separate API instruction file exists

# API & External Integrations

This repo has no backend and no database. "Integration" means a browser-side dependency, a fetched data source, or a persisted save.

## Boundaries

- Validate anything crossing a boundary with **zod** (`^4.4.3`) — save payloads, fetched JSON, `localStorage` reads. Narrow once at entry, trust the typed value after that.
- Secrets come from Vite `loadEnv` only; anything in `import.meta.env` is public and ends up in the bundle.
- No importmap or CDN override for a runtime dependency: it must be in `package.json` so the lockfile and `npm run audit:prod` can see it.

## Network calls

- Give every fetch a timeout plus cancellation (`AbortController`); surface a typed error rather than a raw `Response`.
- Instantiate clients outside hot paths (`useFrame`), and inject them so tests can substitute a fake.
- Retry only idempotent reads, with backoff; never retry a write blindly.

## Adding a dependency

- Check bundle impact and whether an existing package already covers it.
- Record the choice in `docs/ARCHITECTURE/DEC###-*.md` when it changes the architecture.
