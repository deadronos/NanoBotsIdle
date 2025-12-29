# Product Context

## Why this exists

This project explores a lightweight 3D idle/incremental gameplay loop using React Three Fiber: autonomous drones mine a procedural world while the player can explore and manage upgrades.

## Core user experience

- Drop into a world immediately.
- See drones self-direct to targets and visually mine.
- Earn credits from mining, buy upgrades that change drone effectiveness.
- Prestige (“Planetary Jump”) resets the world seed and increases global yield.

## Primary features

- Procedural surface generation based on 2D noise.
- Instanced voxel rendering for performance.
- Drone AI loop: seek → move → mine.
- Overlay HUD + upgrade modal; supports pointer lock gameplay.
