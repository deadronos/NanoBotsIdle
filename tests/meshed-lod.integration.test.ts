import { BufferGeometry, Mesh, PerspectiveCamera, Sphere, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { applyLodGeometry } from "../src/render/lodGeometry";
import { applyChunkVisibility, createLodThresholds } from "../src/render/lodUtils";

const makeGeometry = (center: Vector3) => {
  const geometry = new BufferGeometry();
  geometry.boundingSphere = new Sphere(center.clone(), 1);
  return geometry;
};

describe("meshed LOD selection", () => {
  it("swaps chunk geometry when downgrading and upgrading LOD", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const thresholds = createLodThresholds(16, {
      lowDistanceMultiplier: 1,
      hideDistanceMultiplier: 10,
    });

    const center = new Vector3(40, 0, 0);
    const high = makeGeometry(center);
    const low = makeGeometry(center);
    const mesh = new Mesh(high);
    mesh.userData.lodGeometries = { high, low };

    applyChunkVisibility([mesh], camera, thresholds, {
      onLodChange: (target, lod) => applyLodGeometry(target, lod),
    });

    expect(mesh.userData.lod).toBe("low");
    expect(mesh.geometry).toBe(low);

    camera.position.set(40, 0, 0);
    camera.lookAt(40, 0, -1);
    camera.updateMatrixWorld();

    applyChunkVisibility([mesh], camera, thresholds, {
      onLodChange: (target, lod) => applyLodGeometry(target, lod),
    });

    expect(mesh.userData.lod).toBe("high");
    expect(mesh.geometry).toBe(high);
  });
});
