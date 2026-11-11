# Gameplay polish

- Branch `codex/gameplay-polish`
- First pass: consolidate the responsive HUD, make the drone map optional, and keep overlays usable on narrow screens.
- Replace the remote cloud dependency with an asset-free daytime scene. Align the sun with the light and use sky and ground fill for clearer terrain relief.
- Fix cancelled touch movement and clear held input on focus loss.
- Use the existing simulation and rendering boundaries in TECH001 and TECH005. Validate browser interactions, blocked asset requests, and minimap update cost before handing off.

## Validation

- Typecheck, lint, build and 416 Vitest tests passed. One test file was skipped.
- Production Chrome at 1440×900 verified camera, pause/resume, placement cancellation, research and the optional minimap. With external requests blocked, the scene made zero external requests and raised no runtime errors.
- Chrome at 320×568 verified touch controls, the research dialog scrolling to prestige, and Settings.
- Before the change, the minimap reset its canvas 26 times in four seconds. It now retains its canvas while open, draws at most 10 times per second, and stops drawing when closed.
- The production build still warns about large bundles. The opening view still needs work around the starter outpost's fixed altitude and camera framing.

## Landing site, economy HUD and terrain

- Added a deterministic landing site, terrain-aware player spawn and respawn, and an opening view with the player beside the outpost. Legacy generated outposts are rebuilt from the seed, while built outposts keep their IDs and levels.
- Added rolling deposit income, in-flight cargo value, and the cheapest uncapped upgrade to the HUD. The research cards share the upgrade names.
- Added shared directional vertex shading, a revised terrain palette, and a softer teal shoreline. Updated the checked-in palette baselines.
- Reduced the production simulation worker from 4,708.57 kB to 176.47 kB uncompressed by importing BVX storage directly. The main JavaScript bundle fell from 3,535.13 kB to 1,370.60 kB. Sizes compare the first-pass branch build with the integrated build.
- [Design](../designs/DESIGN012-gameplay-polish.md)

## Final verification

- Typecheck, lint, production build and 434 tests passed. One test file was skipped.
- On Chrome with ANGLE Metal on Apple M4 at 1280×800, the six-second opening-view sample measured 16.7 ms median and 16.8 ms p95 frame time. The first-pass baseline measured 16.7 ms median and 18.4 ms p95. The final view averaged 65 draw calls per frame versus 61 and retained one offscreen pass. Camera framing differs between builds.
- The first 30 final meshing results measured 0.4 ms median and 2.1 ms p95. The baseline delivered 28 results at 0.5 ms median and 2.9 ms p95. Simulation tick p95 was 0.1 ms in both runs.
- Review led to a state-preserving Pause, a fresh fleet on prestige, and a starter support column that drones skip.
