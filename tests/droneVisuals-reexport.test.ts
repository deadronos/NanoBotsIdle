import { describe, expect, it } from "vitest";

import { updateDroneInstancedVisuals } from "../src/components/drones/droneInstancedVisuals";
import { updateDroneVisuals } from "../src/components/drones/droneVisuals";

describe("droneVisuals (re-export)", () => {
  it("aliases instanced visuals updater", () => {
    expect(updateDroneVisuals).toBe(updateDroneInstancedVisuals);
  });
});

