# Mining operations

Branch `codex/mining-operations` extends the gameplay polish merged in PR #214. See [the design](../designs/DESIGN013-mining-operations.md).

- Added terrain selection and confirmation for one mining zone. The simulation maintains the eligible frontier and releases abandoned reservations.
- Added outpost purchase previews with projected route changes on the minimap. Dock occupancy and queue length come from the worker. Queued drones keep their dock until they leave the queue or finish unloading.
- Added two prestige destinations and persisted the selected profile. Added tinted cut flashes and debris plus visible cargo pods.
- Added the `busy-colony` preset with 45 miners, five haulers, four outposts including the starter, and continuous movement to request new chunks.

Run a desktop sample against the production preview with:

```sh
npm run profile -- --scene busy-colony --chrome --url http://127.0.0.1:4173/NanoBotsIdle/
```

Add `--mobile` for a 390×844 touch viewport on the same hardware.

## Verification

- Typecheck, lint, production build, and 438 Vitest tests passed. One test file was skipped.
- Production Chrome verified setting and clearing a zone, previewing and building an outpost, choosing Outer Ridge, and loading that profile again. At 320×568, touch selection and confirmation worked without horizontal overflow.
- Six-second headed Chrome samples used ANGLE Metal on Apple M4. Desktop at 1280×800 measured 16.7 ms median and 17.4 ms p95 frame time before and after. The 390×844 viewport measured 16.7 ms median in both runs and 17.5 to 17.4 ms p95. Draw calls averaged 82 to 81 on desktop and 70 to 71 in the narrow viewport. These are short samples with normal simulation variance.
- The built-in touch-viewport profile collected six telemetry samples and reported 102 meshed chunks. The narrow profile ran on desktop hardware.
