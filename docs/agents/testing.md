# Testing: Patterns & Commands

Canonical test stack in this repo:

- Unit tests: **Vitest** + Testing Library (React Testing Library), `@testing-library/jest-dom`
- E2E / browser: Playwright (see `.github/instructions/playwright-typescript.instructions.md`)

Useful commands:

- `npm test` — run test suite
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage run
- `npm run test:lifecycle` — lifecycle tests

Guidelines:

- Prefer small, deterministic unit tests for store and pure helpers.
- Use role-based locators for Playwright (`page.getByRole`) and Playwright's auto-retrying assertions (e.g., `await expect(locator).toHaveText()`).
- Avoid hard-coded timeouts; prefer auto-wait or injected clocks/fake timers for timing-sensitive tests.
- Keep tests independent and fast; mock external integrations where appropriate.
- Keep test files in `tests/` and name them `<feature>.test.ts` or `<feature>.spec.tsx`.

Status: Resolved

- Unit tests: **Vitest** is the canonical unit test runner for this repository.
- E2E tests: **Playwright** is the canonical E2E / browser testing tool.
