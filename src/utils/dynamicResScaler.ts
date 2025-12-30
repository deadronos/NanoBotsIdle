export const TARGET_FPS = 60;
export const FPS_TOLERANCE = 5;
export const MIN_DPR = 0.5;
export const MAX_DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1;
export const STEP = 0.1;

export function computeNextDpr(
  fps: number,
  currentDpr: number,
  opts = {
    targetFps: TARGET_FPS,
    tolerance: FPS_TOLERANCE,
    minDpr: MIN_DPR,
    maxDpr: MAX_DPR,
    step: STEP,
  },
) {
  const { targetFps, tolerance, minDpr, maxDpr, step } = opts;
  if (fps < targetFps - tolerance) return Math.max(minDpr, currentDpr - step);
  if (fps > targetFps + tolerance) return Math.min(maxDpr, currentDpr + step);
  return currentDpr;
}

export function initDpr(setDpr: (dpr: number) => void, initial = MAX_DPR) {
  setDpr(initial);
}
