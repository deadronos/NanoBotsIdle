import { describe, expect, it } from "vitest";

import { index3D } from "../src/meshing/apronField";
import { greedyMeshChunk } from "../src/meshing/greedyMesher";

const createApron = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

const setInteriorVoxel = (materials: Uint8Array, size: number, x: number, y: number, z: number, mat: number) => {
  const dim = size + 2;
  materials[index3D(x + 1, y + 1, z + 1, dim)] = mat;
};

const setApronVoxel = (materials: Uint8Array, size: number, x: number, y: number, z: number, mat: number) => {
  const dim = size + 2;
  // x/y/z are in [-1..size] for apron-inclusive coordinates
  materials[index3D(x + 1, y + 1, z + 1, dim)] = mat;
};

const length3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

describe("greedy mesher (TDD)", () => {
  it("should emit empty geometry for all-air chunks", () => {
    const size = 1;
    const result = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials: createApron(size),
    });

    expect(result.positions.length).toBe(0);
    expect(result.indices.length).toBe(0);
    expect(result.normals.length).toBe(0);
  });

  it("should emit 6 quads for a single solid voxel", () => {
    const size = 1;
    const materials = createApron(size);
    setInteriorVoxel(materials, size, 0, 0, 0, 1);

    const result = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials,
    });

    const quadCount = result.indices.length / 6;
    expect(quadCount).toBe(6);

    const vertexCount = result.positions.length / 3;
    expect(vertexCount).toBe(quadCount * 4);
    expect(result.normals.length).toBe(result.positions.length);
  });

  it("should merge a 2x1x1 bar into 6 quads (no internal faces)", () => {
    const size = 2;
    const materials = createApron(size);
    setInteriorVoxel(materials, size, 0, 0, 0, 1);
    setInteriorVoxel(materials, size, 1, 0, 0, 1);

    const result = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials,
    });

    const quadCount = result.indices.length / 6;
    expect(quadCount).toBe(6);
  });

  it("should have triangle winding consistent with emitted normals", () => {
    const size = 1;
    const materials = createApron(size);
    setInteriorVoxel(materials, size, 0, 0, 0, 1);

    const result = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials,
    });

    const { positions, normals, indices } = result;
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;

      const ax = positions[ia];
      const ay = positions[ia + 1];
      const az = positions[ia + 2];
      const bx = positions[ib];
      const by = positions[ib + 1];
      const bz = positions[ib + 2];
      const cx = positions[ic];
      const cy = positions[ic + 1];
      const cz = positions[ic + 2];

      const abx = bx - ax;
      const aby = by - ay;
      const abz = bz - az;
      const acx = cx - ax;
      const acy = cy - ay;
      const acz = cz - az;

      // cross(ab, ac)
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      const nl = length3(nx, ny, nz);
      expect(nl).toBeGreaterThan(0);
      const inx = nx / nl;
      const iny = ny / nl;
      const inz = nz / nl;

      const vnx = normals[ia];
      const vny = normals[ia + 1];
      const vnz = normals[ia + 2];
      const dot = inx * vnx + iny * vny + inz * vnz;
      expect(dot).toBeGreaterThan(0.9);
    }
  });

  it("should not emit faces for solids that exist only in the apron", () => {
    const size = 1;
    const materials = createApron(size);

    // Solid voxel is outside chunk interior (apron), chunk interior remains air.
    setApronVoxel(materials, size, -1, 0, 0, 1);

    const result = greedyMeshChunk({
      size,
      origin: { x: 0, y: 0, z: 0 },
      materials,
    });

    expect(result.positions.length).toBe(0);
    expect(result.indices.length).toBe(0);
    expect(result.normals.length).toBe(0);
  });
});

