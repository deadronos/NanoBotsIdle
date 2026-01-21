# CI/CD (summary)

Key points from `.github/instructions/github-actions-ci-cd-best-practices.instructions.md`:

- Use granular `on` triggers and `concurrency` to avoid redundant runs.
- Pin `uses` actions to major versions or commit SHAs for security.
- Cache wisely and scope caches to branches/tasks.
- Run tests, lint, and typecheck in CI; upload artifacts (coverage, reports) as needed.
- Use environment protection rules and manual approvals for production deployments.
