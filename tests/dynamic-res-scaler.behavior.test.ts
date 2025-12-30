import { describe, expect, it, vi } from "vitest";

import {
  computeNextDpr,
  initDpr,
  MAX_DPR,
  MIN_DPR,
  STEP,
  TARGET_FPS,
} from "../src/utils/dynamicResScaler";

describe("computeNextDpr", () => {
  it("returns same DPR when FPS within tolerance", () => {
    const dpr = computeNextDpr(TARGET_FPS, 1);
    expect(dpr).toBe(1);
  });

  it("decreases DPR when FPS is too low", () => {
    const dpr = computeNextDpr(TARGET_FPS - 10, 1);
    expect(dpr).toBeCloseTo(1 - STEP, 5);
  });

  it("does not go below MIN_DPR", () => {
    const dpr = computeNextDpr(0, MIN_DPR);
    expect(dpr).toBe(MIN_DPR);
  });

  it("increases DPR when FPS is high", () => {
    const dpr = computeNextDpr(TARGET_FPS + 10, 0.5);
    expect(dpr).toBeCloseTo(0.5 + STEP, 5);
  });

  it("does not exceed MAX_DPR", () => {
    const dpr = computeNextDpr(9999, MAX_DPR);
    expect(dpr).toBe(MAX_DPR);
  });
});

describe("initDpr", () => {
  it("calls setDpr with initial value", () => {
    const setDpr = vi.fn();
    initDpr(setDpr, 0.42);
    expect(setDpr).toHaveBeenCalledWith(0.42);
  });
});
