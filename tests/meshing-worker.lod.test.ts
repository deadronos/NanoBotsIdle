import { describe, expect, it } from "vitest";

import { index3D } from "../src/meshing/apronField";
import { handleMeshingJob } from "../src/meshing/workerHandler";
import type { MeshingJob } from "../src/shared/meshingProtocol";

const createApron = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

describe("meshing worker LOD payload", () => {
  it("includes a coarse LOD geometry alongside the full mesh", () => {
    const size = 4;
    const materials = createApron(size);

    // Populate a sparse checker pattern to trigger meaningful downsampling.
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        for (let z = 0; z < size; z += 2) {
          materials[index3D(x + 1, y + 1, z + 1, size + 2)] = 1;
        }
      }
    }

    const job: MeshingJob = {
      t: "MESH_CHUNK",
      jobId: 42,
      rev: 3,
      chunk: { cx: 1, cy: 2, cz: 3, size },
      origin: { x: 16, y: 32, z: 48 },
      materials,
    };

    const out = handleMeshingJob(job);
    expect(out.t).toBe("MESH_RESULT");
    if (out.t !== "MESH_RESULT") throw new Error("expected MESH_RESULT");

    expect(out.lods?.length).toBeGreaterThan(0);
    const low = out.lods?.find((lod) => lod.level === "low");
    expect(low).toBeDefined();
    expect(low?.geometry.positions.length).toBeGreaterThan(0);
    expect(low?.geometry.indices.length).toBeGreaterThan(0);
    expect(low?.geometry.positions.length).toBeLessThan(out.geometry.positions.length);
  });
});
