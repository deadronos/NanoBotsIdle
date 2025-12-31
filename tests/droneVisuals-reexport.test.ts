import { describe, expect, it } from "vitest";

import { updateDroneVisuals } from "../src/components/drones/droneVisuals";
import { updateDroneInstancedVisuals } from "../src/components/drones/droneInstancedVisuals";

describe("droneVisuals (re-export)", () => {
  it("aliases instanced visuals updater", () => {
    expect(updateDroneVisuals).toBe(updateDroneInstancedVisuals);
  });
});

