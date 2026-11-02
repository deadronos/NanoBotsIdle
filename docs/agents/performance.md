Canonical long-form: `.github/instructions/performance-optimization.instructions.md`

# Performance

Read the frontend/framework sections of the canonical file only; ignore the backend/DB material — this repo has no server.

## Measure first

- `npm run profile` and `npm run profile:baseline`; snapshots land in `dev/profiling/snapshots/` (gitignored).
- Thresholds: `.github/performance-thresholds.json`. Regression checker: `scripts/check-performance-regression.js`.
- Quote numbers, not adjectives.

## Render loop

- `useFrame()` is the default suspect: no `new Vector3/Color/Matrix4`, no per-frame array scans, no `setState` per frame.
- Reuse objects via `useRef`/`useMemo`; batch `InstancedMesh.instanceMatrix.needsUpdate`; initialize matrices in `useLayoutEffect`.

## World and voxels

- Prefer the instancing/meshing plus LOD/culling already in `src/components/world/`; never iterate all voxels per frame.
- Watch draw calls and DPR. `dynamic-res-scaler` already exists for adaptive DPR — don't add a second mechanism.

Document a new hot path with a note in the PR, and a `TECH###`/`DEC###` entry when the approach changes.
