import { useGameStore } from "../state/store";
import { tickWorld } from "../ecs/world/tickWorld";
import { AudioManager } from "../audio/AudioManager";

let lastTime = 0;
let animationFrameId: number | null = null;
let lastSaveTime = 0;
let lastHeatCheckTime = 0;
let ambientStarted = false;
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const HEAT_CHECK_INTERVAL = 1000; // Check heat warnings every second
const CRITICAL_HEAT_RATIO = 1.5; // 150% heat - cascade failure
const WARNING_HEAT_RATIO = 1.0; // 100% heat - warning threshold

export function startSimLoop() {
  if (animationFrameId !== null) return; // Already running

  lastTime = performance.now();
  lastSaveTime = performance.now();
  lastHeatCheckTime = performance.now();

  function loop(currentTime: number) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = currentTime;

    const state = useGameStore.getState();

    // Tick the world simulation
    tickWorld(state.world, dt);

    // Update UI snapshot
    state.updateUISnapshot();
    
    // Audio updates
    const droneCount = Object.keys(state.world.droneBrain).length;
    const heatRatio = state.world.globals.heatCurrent / state.world.globals.heatSafeCap;
    
    // Start ambient if we have drones and haven't started yet
    if (droneCount > 0 && !ambientStarted) {
      AudioManager.startAmbient(droneCount);
      ambientStarted = true;
    }
    
    // Update ambient sound based on activity
    if (ambientStarted) {
      AudioManager.updateAmbient(droneCount, heatRatio);
    }
    
    // Heat warnings
    if (currentTime - lastHeatCheckTime > HEAT_CHECK_INTERVAL) {
      if (heatRatio > CRITICAL_HEAT_RATIO) {
        // Cascade failure - critical alarm
        AudioManager.play("heatCritical");
      } else if (heatRatio > WARNING_HEAT_RATIO) {
        // Over safe capacity - warning
        AudioManager.play("heatWarning");
      }
      lastHeatCheckTime = currentTime;
    }

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
  
  // Stop ambient audio
  AudioManager.stopAmbient();
  ambientStarted = false;
}
