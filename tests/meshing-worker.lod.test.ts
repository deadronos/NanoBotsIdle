import { describe, expect, it } from "vitest";

import { fillApronField, index3D } from "../src/meshing/apronField";
import type { MeshGeometry } from "../src/meshing/meshTypes";
import { handleMeshingJob } from "../src/meshing/workerHandler";
import type { MeshingJob } from "../src/shared/meshingProtocol";

const createApron = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

describe("meshing worker LOD payload", () => {
  it("includes a coarse LOD geometry alongside the full mesh", () => {
    const size = 8;
    const materials = createApron(size);

    // Populate a sparse checker pattern to trigger meaningful downsampling.
    for (let x = 1; x < size - 1; x += 2) {
      for (let y = 1; y < size - 1; y += 2) {
        for (let z = 1; z < size - 1; z += 2) {
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

it("preserves shared-face coverage across high and low LOD after a boundary edit", () => {
  const size = 8;
  const edited = { x: -1, y: 4, z: 3 };
  const materialAt = (x: number, y: number, z: number) => {
    if (x === edited.x && y === edited.y && z === edited.z) return 0;
    if (x === -1 || x === 0) return Number(y < (x === -1 ? 6 : 3) && z >= 0 && z < 8);
    return Number(Math.abs(x) % 2 === 0 && y % 2 === 1 && z % 2 === 1);
  };
  const mesh = (cx: number) => {
    const origin = { x: cx * size, y: 0, z: 0 };
    const materials = createApron(size);
    fillApronField(materials, { size, origin, materialAt });
    const result = handleMeshingJob({
      t: "MESH_CHUNK",
      jobId: 1,
      rev: 2,
      chunk: { cx, cy: 0, cz: 0, size },
      origin,
      materials,
    });
    if (result.t !== "MESH_RESULT") throw new Error(result.message);
    return result;
  };
  const boundary = ({ positions, normals }: MeshGeometry) => {
    const faces: string[] = [];
    for (let i = 0; i < positions.length; i += 12) {
      if (positions[i] !== 0 || normals[i] === 0) continue;
      const ys = [positions[i + 1], positions[i + 4], positions[i + 7], positions[i + 10]];
      const zs = [positions[i + 2], positions[i + 5], positions[i + 8], positions[i + 11]];
      for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
        for (let z = Math.min(...zs); z < Math.max(...zs); z++)
          faces.push(`${normals[i]},${y},${z}`);
      }
    }
    return faces.sort();
  };
  const left = mesh(-1);
  const right = mesh(0);
  const leftHigh = boundary(left.geometry);
  const rightHigh = boundary(right.geometry);
  expect(leftHigh).toContain("1,4,2");
  expect(leftHigh).not.toContain("1,4,3");
  expect(boundary(left.lods![0].geometry)).toEqual(leftHigh);
  expect(boundary(right.lods![0].geometry)).toEqual(rightHigh);
  expect(
    new Set([...leftHigh, ...rightHigh].map((face) => face.slice(face.indexOf(",") + 1))).size,
  ).toBe(leftHigh.length + rightHigh.length);
});
