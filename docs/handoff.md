Implemented a bounded sun/block lighting system with torch emission, per-vertex lighting in meshing, and light-aware mob spawning with caps. The core changes live in lighting.ts, World.ts, meshing.ts, GameScene.tsx, and gameEcs.ts, with new tests in lighting.test.ts and mobSpawning.test.ts. Memory tracking is updated in TASK007-design006-torches-lighting-mobs.md, _index.md, activeContext.md, and progress.md.

Tests run: npm test

Next steps you might want:

Tune light propagation limits and spawn thresholds for gameplay feel.
Add mob rendering/visuals so spawns are visible in-game.Implemented a bounded sun/block lighting system with torch emission, per-vertex lighting in meshing, and light-aware mob spawning with caps. The core changes live in lighting.ts, World.ts, meshing.ts, GameScene.tsx, and gameEcs.ts, with new tests in lighting.test.ts and mobSpawning.test.ts. Memory tracking is updated in TASK007-design006-torches-lighting-mobs.md, _index.md, activeContext.md, and progress.md.

Tests run: npm test

Next steps you might want:

Tune light propagation limits and spawn thresholds for gameplay feel.
Add mob rendering/visuals so spawns are visible in-game.
