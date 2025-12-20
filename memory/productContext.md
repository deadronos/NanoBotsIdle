# Product Context

## Why this exists

NanoBots Idle is a lightweight voxel sandbox: a playable foundation for experimenting with chunked voxel worlds, meshing, and basic survival-style interactions in a web-friendly stack.

## What the user experiences

- Start in a procedurally generated world (terrain, beaches, water, trees, bedrock).
- Enter pointer lock and move in first-person.
- Break blocks (left click) and place blocks from hotbar (right click).
- Manage inventory and craft batches from recipes.
- See real-time stats (FPS/pos/chunks/time/target block).

## Controls (current)

- Movement: WASD
- Jump: Space
- Sprint: Shift
- Hotbar select: 1–9
- Inventory: E
- Break: Left click
- Place: Right click
- Unlock pointer: Esc

## UX constraints

- UI overlays must cooperate with pointer lock.
- The world and rendering must remain responsive; heavy work is intentionally bounded per frame.
