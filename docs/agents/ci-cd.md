Canonical long-form: `.github/instructions/github-actions-ci-cd-best-practices.instructions.md`

# CI/CD

Read only "Workflow Structure", "Security", and "Caching" in the canonical file; skip the backend/cloud-deploy sections.

## Real workflows

| File | Does |
| --- | --- |
| `.github/workflows/ci.yml` | typecheck → lint → `audit:prod` → test |
| `.github/workflows/deploy-pages-on-tag.yml` | build + Pages deploy on tag |
| `.github/workflows/profile.yml` | Playwright chromium, build, preview, perf run |

`ci.yml` currently runs on `workflow_dispatch` only (push/PR triggers are commented out) and pins Node 18. Know this before claiming "CI will catch it".

## Rules

- Job order is intentional: typecheck and lint fail fast before the test suite.
- `npm ci` only; `actions/setup-node` with `cache: npm`. No `npm install` in workflows.
- Pin `uses:` to a major (`actions/checkout@v6`, `actions/setup-node@v6`) or a SHA; grant `GITHUB_TOKEN` least privilege.
- Add `concurrency: {group: ci-${{ github.ref }}, cancel-in-progress: true}` when PR triggers are re-enabled.
- Coverage comes from `npm run test:coverage`; profile snapshots land in `dev/profiling/snapshots/` (gitignored) — upload as artifacts, never commit.
- No secrets in logs; one workflow per concern, no workflow for a one-off script.
