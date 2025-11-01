import { tickWorld, type TickOptions } from "../ecs/world/tickWorld";
import { useGameStore } from "../state/store";

const MAX_FRAME_DT = 0.1; // Safety clamp to avoid giant simulation jumps.
const DEFAULT_FRAME_DT = 1 / 60;

let frameHandle: number | null = null;
let lastTimestamp: number | null = null;
let activeOptions: TickOptions | undefined;

const clampDt = (dtSeconds: number): number => {
  if (!Number.isFinite(dtSeconds)) {
    return 0;
  }
  if (dtSeconds <= 0) {
    return 0;
  }
  return Math.min(dtSeconds, MAX_FRAME_DT);
};

export const stepSimulation = (dtSeconds: number, options?: TickOptions): void => {
  const dt = clampDt(dtSeconds);
  const { world } = useGameStore.getState();
  tickWorld(world, dt, options);
};

const animationFrameLoop = (timestamp: number): void => {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
    stepSimulation(DEFAULT_FRAME_DT, activeOptions);
  } else {
    const dtSeconds = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    stepSimulation(dtSeconds, activeOptions);
  }

  frameHandle = window.requestAnimationFrame(animationFrameLoop);
};

export const startSimulation = (options?: TickOptions): void => {
  if (typeof window === "undefined") {
    // In non-browser environments we just execute a single deterministic step.
    stepSimulation(DEFAULT_FRAME_DT, options);
    return;
  }

  if (frameHandle !== null) {
    return;
  }

  activeOptions = options;
  lastTimestamp = null;
  frameHandle = window.requestAnimationFrame(animationFrameLoop);
};

export const stopSimulation = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (frameHandle !== null) {
    window.cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }

  lastTimestamp = null;
  activeOptions = undefined;
};

export const isSimulationRunning = (): boolean => frameHandle !== null;
