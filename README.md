# NanoBotsIdle (Voxel Walker)

A 3D Voxel Incremental/Idle game built with React Three Fiber. Command a fleet of autonomous mining drones to strip-mine procedurally generated planets, research upgrades, and warp to new worlds.

![Game Screenshot](./image.png)

## 🎮 Controls

| Key            | Action                                   |
| -------------- | ---------------------------------------- |
| **W A S D**    | Move Player                              |
| **Space**      | Jump                                     |
| **Shift**      | Sprint                                   |
| **Click**      | Lock Mouse (Camera Control)              |
| **UI Buttons** | Toggle View (1st/3rd), Open Research Lab |

## 🌟 Features

### 🤖 Autonomous Drone Fleet

- Drones automatically seek valuable voxel blocks.
- Visual mining lasers and particle effects.
- **Upgradable AI:** Increase fleet size, mining speed, and thruster velocity.

### 🪐 Procedural Voxel Worlds

- Infinite (pseudo-infinite via prestige) procedural terrain generation.
- Destructible environment: Drones physically remove blocks from the world.
- Different biomes/height maps based on prestige seed.

### 🔬 Research & Progression

- **Credits:** Earned by mining blocks.
- **Upgrades:**
  - **Drone Count:** Expand your swarm.
  - **Drill Speed:** Mine blocks faster.
  - **Thrusters:** Reduce travel time between blocks.
  - **Laser Power:** Visual intensity upgrades.
- **Prestige (Planetary Jump):** Warp to a new, fresh planet when resources run low. Increases global resource multipliers.

### 🎥 Dual Camera Modes

- **First Person:** Immersive view for exploring the mines.
- **Third Person:** Tactical view of your character and the drone swarm.

## 🛠️ Tech Stack

- **Core:** React, TypeScript, Vite
- **3D Engine:** Three.js, @react-three/fiber, @react-three/drei
- **State Management:** Zustand
- **Styling:** TailwindCSS
- **Physics/Math:** Custom voxel collision & Simplex noise

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start development server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## 🐛 Debugging & Logging

This project uses a centralized logger utility (`src/utils/logger.ts`) for consistent logging across the codebase.

### Logger Usage

The logger provides environment-aware logging methods that:
- **Development:** Display debug logs in the browser console
- **Production:** Strip all debug logs from the build (only errors remain)

```typescript
import { debug, info, warn, error } from '@/utils/logger';

// Debug logs (development only)
debug('Player position:', { x, y, z });

// Info logs (development only)
info('Drone started mining block');

// Warning logs (development only)
warn('Low credit balance');

// Error logs (always visible)
error('Failed to load configuration:', err);
```

### Runtime Debug Toggle

In development, you can toggle debug logging at runtime via the browser console:

```javascript
// Enable debug logging
import { enableDebug } from './src/utils/logger';
enableDebug();

// Disable debug logging
import { disableDebug } from './src/utils/logger';
disableDebug();

// Check debug status
import { isDebugEnabled } from './src/utils/logger';
console.log(isDebugEnabled());
```

### ESLint Rule

Direct `console.*` usage is prohibited in `src/` to ensure consistent logging. Use the logger utility instead.
Exceptions: tests, scripts, workers, and the logger utility itself.

## 🧪 Testing & Quality

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run lifecycle/memory leak tests specifically
npm run test:lifecycle
```

### Memory Profiling

NanoBotsIdle includes comprehensive memory leak detection and profiling tools to ensure long-running sessions remain stable:

```bash
# Generate baseline memory profile
npm run profile:baseline
```

For detailed profiling guidance and leak detection, see [dev/profiling/README.md](dev/profiling/README.md).

**What's tested:**
- Chunk load/unload cycles don't accumulate unbounded state
- Worker termination properly cleans up event handlers
- InstancedMesh updates don't leak Three.js object references
- Repeated meshing operations maintain stable memory usage

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run typecheck

# Format code
npm run format
```

