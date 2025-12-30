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

## 🔬 Performance Profiling

### Local Profiling

To profile the application locally and collect performance metrics:

1. **Start the preview server:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Run the profiling script:**
   ```bash
   npm run profile
   ```

   This will:
   - Launch a headless browser
   - Run the game for 30 seconds (configurable)
   - Collect telemetry metrics (FPS, frame time, meshing time, worker stats)
   - Save results to `profile-metrics.json`

3. **Custom profiling options:**
   ```bash
   node scripts/profile.js --duration 60 --output ./my-metrics.json --url http://localhost:4173
   ```

### Manual Telemetry Access

You can enable telemetry in your browser and access metrics via the console:

1. **Start the dev server with telemetry enabled:**
   ```bash
   npm run dev
   ```

2. **Open the app with telemetry enabled:**
   Navigate to `http://localhost:5173?telemetry=true`

3. **Access metrics in the console:**
   ```javascript
   // Get current telemetry snapshot
   const metrics = JSON.parse(window.getTelemetrySnapshot());
   console.log(metrics);
   ```

### CI Profiling

Performance profiling runs automatically on every push to `main` and on pull requests via GitHub Actions. The workflow:

- Builds the application
- Runs a 30-second headless profile
- Compares metrics against the baseline from `main`
- Reports any significant performance regressions in PR comments
- Stores metrics as artifacts for historical analysis

View profiling results in the **Actions** tab of the repository.
