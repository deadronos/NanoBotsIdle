import { describe, expect, test } from "vitest";

import { ECS_LIGHTING } from "../../config/ecs";
import { createLightingState, updateLightingState } from "./gameEcs";

describe("lighting state", () => {
  test("computes sun phase and intensities from time of day", () => {
    const state = createLightingState(ECS_LIGHTING, 0);

    expect(state.timeOfDay).toBeCloseTo(0);
    expect(state.sunPhase).toBeCloseTo(0.5);
    expect(state.ambientIntensity).toBeCloseTo(
      ECS_LIGHTING.ambientBase + ECS_LIGHTING.ambientScale * 0.5,
    );
    expect(state.sunIntensity).toBeCloseTo(
      ECS_LIGHTING.sunBase + ECS_LIGHTING.sunScale * 0.5,
    );
  });

  test("wraps time of day into 0..1 range", () => {
    const state = createLightingState(ECS_LIGHTING, 0);
    updateLightingState(state, 1.25, ECS_LIGHTING);
    expect(state.timeOfDay).toBeCloseTo(0.25);
  });
});
