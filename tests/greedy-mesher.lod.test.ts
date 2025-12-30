import { describe, expect, it } from "vitest";

import { index3D } from "../src/meshing/apronField";
import { __testing, greedyMeshChunk } from "../src/meshing/greedyMesher";

describe("greedy mesher LOD", () => {
  it("downsamples apron field and produces a smaller geometry", () => {
    const size = 4;
    const materials = __testing.createApron(size);

    // Populate a sparse checker pattern so the high LOD emits many small quads.
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        for (let z = 0; z < size; z += 2) {
          materials[index3D(x + 1, y + 1, z + 1, size + 2)] = 1;
        }
      }
    }

    const high = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials,
    });

    const lodInput = __testing.downsampleMaterials(materials, size, 2);
    const low = greedyMeshChunk({
      size: lodInput.size,
      origin: { x: 0, y: 0, z: 0 },
      voxelSize: lodInput.voxelSize,
      materials: lodInput.materials,
    });

    expect(low.positions.length).toBeGreaterThan(0);
    expect(low.indices.length).toBeGreaterThan(0);
    expect(low.positions.length).toBeLessThan(high.positions.length);
    expect(low.indices.length).toBeLessThan(high.indices.length);
  });
});
