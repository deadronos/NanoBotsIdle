import { BufferGeometry, Mesh, PerspectiveCamera, Sphere, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { applyChunkVisibility, createLodThresholds } from "../../src/render/lodUtils";

/**
 * Perf smoke test: Validate that LOD/culling reduces visible mesh count.
 *
 * Baseline: All meshes visible at 100%.
 * Target: At least 50% reduction when camera is positioned to cull distant chunks.
 */

const makeMeshWithSphere = (center: Vector3, radius = 8) => {
  const geometry = new BufferGeometry();
  geometry.boundingSphere = new Sphere(center.clone(), radius);
  return new Mesh(geometry);
};

const createChunkGrid = (size: number, chunkSize: number) => {
  const meshes: Mesh[] = [];
  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const center = new Vector3(x * chunkSize + chunkSize / 2, 0, z * chunkSize + chunkSize / 2);
      meshes.push(makeMeshWithSphere(center, chunkSize / 2));
    }
  }
  return meshes;
};

describe("LOD culling perf smoke", () => {
  it("reduces visible mesh count by at least 50% with distance culling", () => {
    const chunkSize = 16;
    const gridSize = 5; // 11×11 = 121 chunks
    const meshes = createChunkGrid(gridSize, chunkSize);

    const thresholds = createLodThresholds(chunkSize, {
      lowDistanceMultiplier: 2,
      hideDistanceMultiplier: 4,
    });

    // Camera at origin looking forward
    const camera = new PerspectiveCamera(60, 1, 0.1, 500);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, -100);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Apply visibility
    applyChunkVisibility(meshes, camera, thresholds);

    const totalMeshes = meshes.length;
    const visibleMeshes = meshes.filter((m) => m.visible).length;
    const hiddenMeshes = totalMeshes - visibleMeshes;

    // Expect at least 50% reduction
    const reductionPct = (hiddenMeshes / totalMeshes) * 100;

    expect(reductionPct).toBeGreaterThanOrEqual(50);
    expect(visibleMeshes).toBeGreaterThan(0); // Some should still be visible
  });

  it("tracks LOD distribution across visible meshes", () => {
    const chunkSize = 16;
    const gridSize = 5; // 11×11 = 121 chunks for more spread
    const meshes = createChunkGrid(gridSize, chunkSize);

    const thresholds = createLodThresholds(chunkSize, {
      lowDistanceMultiplier: 1,
      hideDistanceMultiplier: 3, // Tighter threshold to ensure some are hidden
    });

    const camera = new PerspectiveCamera(60, 1, 0.1, 500);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, -50);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    applyChunkVisibility(meshes, camera, thresholds);

    const lodCounts = { high: 0, low: 0, hidden: 0 };
    for (const mesh of meshes) {
      const lod = mesh.userData.lod as "high" | "low" | "hidden";
      if (lod) lodCounts[lod]++;
    }

    // Should have a mix of LOD levels
    expect(lodCounts.high).toBeGreaterThan(0);
    expect(lodCounts.hidden).toBeGreaterThan(0);
  });
});
