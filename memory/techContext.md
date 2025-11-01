# Technical Context

## Tech stack

- TypeScript (strict)
- React 19 + Vite
- Zustand for state management
- Tailwind CSS for styles
- ECS architecture implemented in `src/ecs/`

## Local development

- Install dependencies: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`

## Important files

- `vite.config.ts`, `tsconfig.json`, `package.json`
- Simulation code: `src/sim/` and `src/ecs/`
- UI components: `src/ui/`

## CI / tests

- The repository uses Vite; consider adding Vitest unit tests for simulation logic (there is a `vitest.config.ts` file in the repo).
