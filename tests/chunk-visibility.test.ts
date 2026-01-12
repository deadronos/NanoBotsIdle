import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";

import { createLodThresholds, isChunkVisible } from "../src/render/lodUtils";

describe("isChunkVisible", () => {
  it("respects frustum visibility and hide-distance thresholds", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 500);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const thresholds = createLodThresholds(16, {
      lowDistanceMultiplier: 2,
      hideDistanceMultiplier: 3,
    });

    expect(isChunkVisible({ cx: 0, cy: 0, cz: -1 }, 16, camera, thresholds)).toBe(true);
    expect(isChunkVisible({ cx: 0, cy: 0, cz: -5 }, 16, camera, thresholds)).toBe(false);
    expect(isChunkVisible({ cx: 5, cy: 0, cz: -1 }, 16, camera, thresholds)).toBe(false);
  });
});
