# Testing and Code Quality Setup

This project uses modern tooling for testing and code quality:

## 🧪 Testing with Vitest

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Tests are located in `src/test/` and follow the pattern `*.test.ts` or `*.test.tsx`.

Example test:
```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    expect(true).toBe(true);
  });
});
```

## 🔍 Linting with ESLint

### Running ESLint

```bash
# Check for linting issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### ESLint Configuration

- Uses the new flat config format (`eslint.config.js`)
- TypeScript support with `typescript-eslint`
- React hooks rules
- React Refresh rules for HMR
- Prettier integration to avoid conflicts

## 💅 Formatting with Prettier

### Running Prettier

```bash
# Format all files
npm run format

# Check formatting without modifying files
npm run format:check
```

### Prettier Configuration

Configuration is in `.prettierrc`:
- 2 spaces indentation
- Semicolons required
- Double quotes
- 100 character line width
- Trailing commas in ES5

## 📝 Type Checking

```bash
# Run TypeScript compiler without emitting files
npm run typecheck
```

## 🔄 Pre-commit Workflow

Recommended workflow before committing:

```bash
npm run format        # Format code
npm run lint:fix      # Fix linting issues
npm run typecheck     # Check types
npm test              # Run tests
npm run build         # Verify build works
```

## 📦 Installed Packages

### Testing
- `vitest` - Fast unit test framework
- `@vitest/ui` - UI for test results
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - DOM matchers
- `jsdom` - DOM implementation for testing

### Linting
- `eslint` - Linting utility
- `@eslint/js` - JavaScript rules
- `typescript-eslint` - TypeScript rules
- `eslint-plugin-react` - React rules
- `eslint-plugin-react-hooks` - React Hooks rules
- `eslint-plugin-react-refresh` - React Refresh rules

### Formatting
- `prettier` - Code formatter
- `eslint-config-prettier` - Disables ESLint rules that conflict with Prettier
- `eslint-plugin-prettier` - Runs Prettier as an ESLint rule

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Testing Library Documentation](https://testing-library.com/)
