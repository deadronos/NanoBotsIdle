import { describe, expect, it } from "vitest";

import { index3D } from "../src/meshing/apronField";
import { handleMeshingJob } from "../src/meshing/workerHandler";
import type { MeshingJob } from "../src/shared/meshingProtocol";

const createApron = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

describe("meshing worker handler (TDD)", () => {
  it("should return a typed-array MeshResult for a valid job", () => {
    const size = 1;
    const materials = createApron(size);
    materials[index3D(1, 1, 1, size + 2)] = 1;

    const job: MeshingJob = {
      t: "MESH_CHUNK",
      jobId: 123,
      rev: 7,
      chunk: { cx: 0, cy: 0, cz: 0, size },
      origin: { x: 0, y: 0, z: 0 },
      materials,
    };

    const out = handleMeshingJob(job);
    expect(out.t).toBe("MESH_RESULT");
    if (out.t !== "MESH_RESULT") throw new Error("expected MESH_RESULT");

    expect(out.jobId).toBe(123);
    expect(out.rev).toBe(7);
    expect(out.geometry.positions).toBeInstanceOf(Float32Array);
    expect(out.geometry.normals).toBeInstanceOf(Float32Array);
    expect(out.geometry.indices).toBeInstanceOf(Uint16Array);
    expect(out.geometry.positions.buffer).toBeInstanceOf(ArrayBuffer);
    expect(out.geometry.indices.buffer).toBeInstanceOf(ArrayBuffer);
  });
});

