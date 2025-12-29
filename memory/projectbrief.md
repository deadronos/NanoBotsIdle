# NanoBotsIdle — Project Brief

## Overview

NanoBotsIdle ("Voxel Walker") is a small 3D voxel incremental/idle game prototype built with React + Vite + React Three Fiber.

## Goals

- A fun, readable prototype with a clear loop: drones mine → earn credits → buy upgrades → prestige → new world.
- Maintain stable performance (avoid heavy per-frame work; prefer instancing).
- Keep the codebase approachable and easy to iterate on.

## Non-goals

- Full physics engine, networking/multiplayer, or AAA-grade rendering.
- Fully realistic voxel terrain/meshing (currently uses instanced surface blocks).

## Key constraints

- `useFrame()` is performance-critical; avoid per-frame allocations and unbounded scans.
- Prefer mutation via refs for Three/R3F objects.
- Keep changes surgical; preserve existing component APIs unless explicitly changing them.
