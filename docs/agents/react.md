Canonical long-form: `.github/instructions/reactjs.instructions.md`

# React

- Functional components and hooks; composition over inheritance.
- TypeScript types for props and state; explicit types at public boundaries.
- `useEffect` with correct deps and cleanups; `useMemo` / `useCallback` only where a measurement or a dependency rule needs them.
- `React.memo` where a component re-renders from an unchanged parent, not by default.
- Zustand state lives in `src/store.ts`; read slices with selectors, never the whole store.

## Export style

- Components are `const` arrow functions typed `React.FC` with named exports, e.g. `export const World: React.FC = () => {` (`src/components/World.tsx:10`; same pattern in `Drones.tsx`, `UI.tsx`, `ui/ShopModal.tsx`); `App` is the only default-exported component (`src/App.tsx`).
- `React.FC` is kept and used 33 times in `src/` — follow the surrounding file rather than migrating it.
- One component per file; colocate hooks with the feature that owns them.

Unit tests: **Vitest**. E2E: **Playwright**. See `testing.md`.
