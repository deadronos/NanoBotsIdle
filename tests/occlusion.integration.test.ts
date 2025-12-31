import { BufferGeometry, Mesh, PerspectiveCamera, Sphere, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { applyLodGeometry } from "../src/render/lodGeometry";
import { applyChunkVisibility, createLodThresholds } from "../src/render/lodUtils";
import { applyOcclusionVisibility } from "../src/render/occlusionCuller";

const makeGeometry = (center: Vector3) => {
  const geometry = new BufferGeometry();
  geometry.boundingSphere = new Sphere(center.clone(), 1);
  return geometry;
};

describe("occlusion integration with LOD visibility", () => {
  it("layers occlusion culling on top of frustum/LOD visibility", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const thresholds = createLodThresholds(16, {
      lowDistanceMultiplier: 1,
      hideDistanceMultiplier: 10,
    });

    // Create meshes: one close, one that will be marked occluded
    const closeCenter = new Vector3(0, 0, -10);
    const closeHigh = makeGeometry(closeCenter);
    const closeLow = makeGeometry(closeCenter);
    const closeMesh = new Mesh(closeHigh);
    closeMesh.userData.lodGeometries = { high: closeHigh, low: closeLow };

    const occludedCenter = new Vector3(5, 0, -10);
    const occludedHigh = makeGeometry(occludedCenter);
    const occludedMesh = new Mesh(occludedHigh);
    occludedMesh.userData.lodGeometries = { high: occludedHigh };

    // First pass: LOD/frustum visibility
    applyChunkVisibility([closeMesh, occludedMesh], camera, thresholds, {
      onLodChange: (target, lod) => applyLodGeometry(target, lod),
    });

    expect(closeMesh.visible).toBe(true);
    expect(occludedMesh.visible).toBe(true);

    // Simulate occlusion query result marking one mesh as occluded
    occludedMesh.userData.occluded = true;

    // Second pass: occlusion visibility
    applyOcclusionVisibility([closeMesh, occludedMesh]);

    expect(closeMesh.visible).toBe(true);
    expect(occludedMesh.visible).toBe(false);
    expect(occludedMesh.userData.culledByOcclusion).toBe(true);
  });
});
