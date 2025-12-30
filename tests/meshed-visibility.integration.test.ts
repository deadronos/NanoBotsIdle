import { BufferGeometry, Mesh, PerspectiveCamera, Sphere, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { applyChunkVisibility, createLodThresholds } from "../src/render/lodUtils";

const makeMeshWithSphere = (center: Vector3, radius = 1) => {
  const geometry = new BufferGeometry();
  geometry.boundingSphere = new Sphere(center.clone(), radius);
  return new Mesh(geometry);
};

describe("meshed chunk visibility integration", () => {
  it("hides chunks that are far or outside the camera frustum", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const thresholds = createLodThresholds(16, {
      lowDistanceMultiplier: 4,
      hideDistanceMultiplier: 6,
    });

    const near = makeMeshWithSphere(new Vector3(0, 0, -10));
    const far = makeMeshWithSphere(new Vector3(0, 0, -500));
    const side = makeMeshWithSphere(new Vector3(40, 0, -10));

    applyChunkVisibility([near, far, side], camera, thresholds);

    expect(near.visible).toBe(true);
    expect(near.userData.lod).toBe("high");

    expect(far.visible).toBe(false);
    expect(far.userData.lod).toBe("hidden");

    expect(side.visible).toBe(false);
    expect(side.userData.lod).toBe("high");
  });
});
