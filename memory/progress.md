# Progress

## Working

- Game loop: drones mine blocks, credits accrue, upgrades/presitge available.
- Rendering: instanced voxels + basic environment.
- Tooling: Tailwind v4+ via Vite plugin, ESLint/Prettier, Vitest.

## In progress / next

- Expand test coverage (store + utility functions).
- Tune performance as drone counts increase (avoid allocations in `useFrame()`).

## Known notes

- Vite build warns about large chunks (>500kB) after minification; not currently blocking.
