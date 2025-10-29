import { useGameStore } from "../state/store";
import { tickWorld } from "../ecs/world/tickWorld";

let lastTime = 0;
let animationFrameId: number | null = null;
let lastSaveTime = 0;
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export function startSimLoop() {
  if (animationFrameId !== null) return; // Already running

  lastTime = performance.now();
  lastSaveTime = performance.now();

  function loop(currentTime: number) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = currentTime;

    const state = useGameStore.getState();

    // Tick the world simulation
    tickWorld(state.world, dt);

    // Update UI snapshot
    state.updateUISnapshot();

    // Auto-save every 30 seconds
    if (currentTime - lastSaveTime > AUTOSAVE_INTERVAL) {
      state.saveGame();
      lastSaveTime = currentTime;
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
}

export function stopSimLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
