# Improvement Proposals

Here are 5 proposed improvements for NanoBotsIdle, covering Visuals, Thematics, Gameplay, Performance, and Code Quality.

## 1. Visual: Particle Effects & "Juice"
**Goal:** Enhance game feel and feedback.
- **Concept:** Add particle bursts when drones mine a pixel/voxel. Add floating texts (e.g., `+10 Credits`) when Haulers deposit at Outposts.
- **Tech:** Use a lightweight particle system (like `react-three-fiber` instanced mesh particles) to avoid CPU overhead.
- **Benefit:** Makes the game feel "alive" and responsive, a critical factor for retention in idle games.

## 2. Thematic: Strata & Biomes
**Goal:** Add visual variety to the infinite world.
- **Concept:** Instead of a uniform world, implement "Strata" based on depth or distance.
  - *Surface*: Green/Dirt
  - *Layer 2*: Stone/Iron
  - *Layer 3*: Crystal/Obsidian
- **Tech:** Modify the chunk generation logic in `meshing.worker.ts` to assign block colors/IDs based on Y-level or Perlin noise biomes.
- **Benefit:** Provides a sense of progression and exploration.

## 3. Gameplay: Active "Overcharge" Ability
**Goal:** Add active engagement.
- **Concept:** A UI button with a cooldown (stats: 10s Active, 60s CD) that boosts all Drone movespeed and mining speed by 50%.
- **Tech:** Add an `overchargeEndTime` to `GameState`. In the Sim Worker, apply a multiplier if `now < overchargeEndTime`.
- **Benefit:** Gives the player a way to actively speed up the loop, breaking the monotony of pure waiting.

## 4. Performance: Chunk LOD (Level of Detail)
**Goal:** Maintain high FPS with a large world.
- **Concept:** Render distant chunks with lower fidelity.
  - *Close (< 5 chunks)*: Full Instanced Mesh.
  - *Medium (< 10 chunks)*: Simplified geometry (merged faces).
  - *Far*: Don't render, or render as a single "proxy" box.
- **Tech:** Implement distance checking in `VoxelLayerInstanced` and swap geometry references.
- **Benefit:** Prevents frame drops as the player expands their territory significantly.

## 5. Code Quality: Typed Worker Bridge with Zod
**Goal:** Ensure robustness of the Sim-Render separation.
- **Concept:** The `simBridge` currently relies on TypeScript interfaces which are erased at runtime. Use `zod` to validate messages entering and exiting the worker.
- **Tech:** Define `SimToMainMessageSchema` and `MainToSimMessageSchema` using Zod. Parse messages in `simBridge` and inside the worker's `onmessage`.
- **Benefit:** Catches serialization errors and "undefined" payload bugs instantly during development, rather than causing silent de-syncs.
