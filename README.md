# TS VoxelCraft (Minecraft-ish starter)

A compact voxel world in **TypeScript** + **Three.js**, built for the browser.

Features included:
- Chunked voxel storage (16×64×16) + infinite streaming (loads/unloads chunks as you move)
- Procedural terrain (simple fBm/value noise)
- Face culling mesh generation
- Pointer-lock first-person camera
- Basic AABB collisions (walk/jump/sprint)
- DDA voxel picking + block break/place
- Tiny in-code texture atlas (no assets required)

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Next upgrades (if you want it closer to “Minecraft”)

- Greedy meshing (reduce triangles dramatically)
- Real lighting (sunlight propagation + torches)
- Transparent block sorting (water/leaves)
- Chunk streaming + unloading
- Save/load (localStorage, IndexedDB)
- Mobs + AI
- UI: inventory, crafting, hotbar icons
- Multiplayer (authoritative server)

