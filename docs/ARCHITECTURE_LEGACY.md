# Voxel Walker Architecture (Legacy)

**Version:** 0.2.0 (Alpha)
**Last Updated:** 2025-12-29

This file is preserved for historical context. The current architecture source
of truth is `docs/ARCHITECTURE.md`.

## 1. Overview
**Voxel Walker** is a browser-based, 3D Voxel Idle/Clicker game. It combines first-person exploration mechanics (similar to Minecraft) with incremental game loops (auto-mining drones, upgrades, prestige).

### Core Loop
1.  **Explore**: Move around a procedurally generated voxel island.
2.  **Mine**: Click blocks to gain Credits.
3.  **Upgrade**: Spend Credits to buy Drones or improve mining stats.
4.  **Expand**: Drones automate resource collection.
5.  **Prestige**: Reset progress for permanent multipliers (feature stubs in place).

---

## 2. Technology Stack
-   **Runtime**: Browser (Single Page Application)  
-   **Framework**: React 18  
-   **Build Tool**: Vite  
-   **Language**: TypeScript  
-   **3D Engine**: Three.js (via `@react-three/fiber`)  
-   **Abstractions**: `@react-three/drei` (Sky, Clouds, Text helpers)  
-   **State Management**: Zustand (with Persist middleware)  
-   **Styling**: TailwindCSS  
- **Configuration**: Centralized config system (`/src/config`) with typed domain-specific configs (terrain, player, render, economy, drones) and runtime overrides via env variables.

---

## 3. Core Systems

### 3.1 Voxel World Engine (`World.tsx`)
The world is a fixed-radius island generated via 2D Simplex Noise.
-   **Rendering Strategy**: Uses `InstancedMesh` for high performance.
    -   *Optimization*: Only ~4000-5000 instances are rendered.
    -   *Logic*: A single `boxGeometry` is instanced at (x, y, z) coordinates determined by the noise map.
-   **Chunking**: Currently monolithic (single chunk). Future scaling would require chunking logic.
-   **Water**: Originally voxel-based, now replaced by a **Single Plane Mesh** at `y=0.2` for performance and visual clarity.
-   **Bedrock**: A safety plane rendered below the world to prevent looking into the void if the surface is mined away.

### 3.2 Physics & Player Controller (`Player.tsx`)
A custom kinematic physics implementation (no heavy physics engine like Cannon or Rapier).
-   **Collision**: Implicit AABB collision against the Voxel Grid.
    -   Logic: `Math.round(playerPos)` maps directly to array indices. If a block exists at target `(x, y, z)`, movement is blocked.
-   **Gravity**: Constant downward acceleration applied every frame.
-   **Swimming**:
    -   Activated when `y < WATER_LEVEL` (0.1).
    -   Applies `BUOYANCY` (upward force) and `WATER_DRAG` (dampening).
    -   Controls switch to allow vertical movement (`Space` to ascend, `C` to dive).
-   **Mining Interaction**: Uses `Raycaster` from the camera center to detect clicked instances.

### 3.3 Economy & State (`store.ts`)
Managed via **Zustand**.
-   **Persistence**: Automatically saves to `localStorage` key `voxel-walker-storage`.
-   **Versioning**: Save state includes a `version` number to handle future migrations.
-   **Resources**:
    -   `credits`: Main currency.
    -   `minedBlocks`: Counter for achievements/progress.
    -   `totalBlocks`: Used to calculate "mmined percentage".
-   **Upgrades**:
    -   `clickDamage`: Mining speed/power per click.
    -   `clickRange`: Max distance to mine.
    -   `moveSpeed`: Player walk speed.
    -   `droneCount`: Number of active drones.
    -   `droneSpeed`: Speed of drone mining cycles.

### 3.4 Autonomous Drones (`Drones.tsx`)
Visual representations of idle income.
-   **Logic**:
    -   Drones "orbit" or patrol near the player/center.
    -   Every `X` seconds (based on `droneSpeed`), they pick a random valid block from the `World` API.
    -   Visual laser beam effect draws from Drone -> Target Block.
    -   Block is "mined" (scale set to 0), and credits are awarded.

---

## 4. Visuals & Environment
-   **Sky System**: Dynamic sun/moon cycle elements (currently static noon lighting).
-   **Clouds**: Volumetric clouds via Drei `<Clouds>` and `<Cloud>` components.
-   **Material Design**:
    -   Voxels use `MeshStandardMaterial` with `roughness: 0.8` for a matte look.
    -   Water uses `transparent: true`, `opacity: 0.7`, `color: #42a7ff`.

---

## 5. Gameplay specifications

### Terrain Generation Specs
-   **Noise Function**: Simple 2D noise (no heavy libraries).
-   **Bias**: Positive bias `+0.6` creates significant land mass (Island preset).
-   **Voxel Coloring**:
    -   `y < 0.5`: Sand/Water edge
    -   `y < 4`: Grass
    -   `y < 7`: Forest (Dark Green)
    -   `y < 10`: Rock/Stone
    -   `y >= 10`: Snow

### Save System Specs
-   **Auto-Save**: Changes persist immediately (State -> LocalStorage).
-   **Export**: JSON dump of the state tree.
-   **Import**: JSON parsing with schema validation (basic).
-   **Reset**: Hard wipe of localStorage.

---

## 6. Future Considerations / Technical Debt
-   **Mobility**: Jumping physics are currently basic impulses.
-   **Rendering**: `InstancedMesh` re-calculation of matrices on every mine event is okay for single clicks, but creating massive explosions might require a cleaner "dirty flag" approach.
-   **Scalability**: `WORLD_RADIUS > 50` will likely cause framerate drops without chunking and frustum culling.
