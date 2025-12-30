import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";

import { getFrustumFromCamera, isSphereVisible } from "../src/render/frustumUtils";

describe("frustum helpers", () => {
  it("reuses cached frustum and detects visibility", () => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 200);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const frustum = getFrustumFromCamera(camera);
    const second = getFrustumFromCamera(camera);
    expect(second).toBe(frustum);

    expect(isSphereVisible(frustum, { x: 0, y: 0, z: 0 }, 1)).toBe(true);
    expect(isSphereVisible(frustum, { x: 0, y: 0, z: 500 }, 1)).toBe(false);
  });
});
