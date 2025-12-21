import { describe, expect, test } from "vitest";

import { createLightingState, DEFAULT_LIGHTING_CONFIG, updateLightingState } from "./gameEcs";

describe("lighting state", () => {
  test("computes sun phase and intensities from time of day", () => {
    const state = createLightingState(DEFAULT_LIGHTING_CONFIG, 0);

    expect(state.timeOfDay).toBeCloseTo(0);
    expect(state.sunPhase).toBeCloseTo(0.5);
    expect(state.ambientIntensity).toBeCloseTo(
      DEFAULT_LIGHTING_CONFIG.ambientBase + DEFAULT_LIGHTING_CONFIG.ambientScale * 0.5,
    );
    expect(state.sunIntensity).toBeCloseTo(
      DEFAULT_LIGHTING_CONFIG.sunBase + DEFAULT_LIGHTING_CONFIG.sunScale * 0.5,
    );
  });

  test("wraps time of day into 0..1 range", () => {
    const state = createLightingState(DEFAULT_LIGHTING_CONFIG, 0);
    updateLightingState(state, 1.25, DEFAULT_LIGHTING_CONFIG);
    expect(state.timeOfDay).toBeCloseTo(0.25);
  });
});
