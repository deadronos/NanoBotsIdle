Canonical long-form: `.github/instructions/nodejs-javascript-vitest.instructions.md`; Playwright specifics: `.github/instructions/playwright-typescript.instructions.md`

# Testing: Patterns & Commands

Canonical test stack: **Vitest** + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) for units; **Playwright** for E2E and browser flows.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | full Vitest run |
| `npm run test:watch` | watch mode |
| `npm run test:coverage` | coverage run |
| `npm run test:lifecycle` | lifecycle tests |

## Guidelines

- Prefer small, deterministic unit tests for store and pure helpers.
- Test the pure helper, not the `useFrame` body: extract math into a function first.
- Use role-based Playwright locators (`page.getByRole`) and auto-retrying assertions (`await expect(locator).toHaveText()`).
- No hard-coded timeouts; use auto-wait, or fake timers for timing-sensitive tests.
- Keep tests independent and fast; mock external integrations.
- Files live in `tests/` and are named `<feature>.test.ts` or `<feature>.test.tsx`.
