# NanoBots Idle - Voxel Frontier

A React 19 + React Three Fiber sandbox that grows a Minecraft-style voxel world in the browser.

Features included:
- Infinite chunk streaming with pruning (16x72x16 chunks)
- Procedural terrain with beaches, water, trees, and bedrock
- Chunk meshing with face culling
- Pointer-lock first-person controller (walk, sprint, jump)
- DDA voxel picking with break/place
- Inventory, hotbar, and batch crafting recipes
- Day/night light cycle and fog atmosphere
- In-code pixel atlas (no external art required)

## Controls

- WASD move
- Space jump
- Shift sprint
- 1-9 hotbar
- E inventory
- Left click break
- Right click place
- Esc unlock pointer

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Next upgrades

- Greedy meshing and occlusion optimization
- Lighting propagation and torch glow
- Item drops, durability, and tools
- Save/load (IndexedDB)
- Mobs, biomes, and structures
- Multiplayer (authoritative server)
