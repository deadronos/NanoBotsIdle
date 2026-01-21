# Performance (summary)

Key performance practices (from `.github/instructions/performance-optimization.instructions.md`):

- Measure first (profilers, benchmarks), then optimize the bottleneck.
- Frontend: minimize DOM work, lazy-load images, compress assets, use CDNs, defer non-critical scripts.
- React/R3F: avoid allocations in `useFrame`, prefer instancing, use `useRef`/`useMemo` for reusable objects.
- Backend/DB: avoid N+1, index important columns, paginate large results, cache appropriately (Redis).

When to update docs: add a small note when a change introduces a performance-critical code path (include a performance test or profile snapshot).
