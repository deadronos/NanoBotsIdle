# Active Context

**Current focus**

- Implement and validate the core ECS bootstrap tick loop and core production chain systems (see `DES022`, `TASK022`, `DES001`, `TASK001`).
- Improve memory-bank documentation and developer onboarding artifacts.

**Recent changes**

- Repository scaffold and many design/task placeholders exist under `memory/designs` and `memory/tasks`.
- Branch `rewrite` is active for major refactors; CI and build configs live at project root.

**Next steps**

1. Finalize ECS bootstrap tick implementation and add unit tests for balance logic.
2. Implement minimal pathfinding MVP and drone hauling to demonstrate end-to-end production.
3. Iterate on UI snapshot throttle to ensure responsive rendering at large simulation sizes.

**Open decisions**

- Determinism vs. performance trade-offs for pathfinding and drone routing.
- How much simulation state to expose to the UI vs. keep encapsulated in systems.

**Contacts / maintainers**

- Primary: repository owner (see GitHub repo) and contributors listed in `package.json`.
