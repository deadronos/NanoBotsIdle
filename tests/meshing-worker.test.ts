import { Color } from "three";
import { describe, expect, it } from "vitest";

import { buildBufferGeometry } from "../src/components/world/mesh/geometryBuilder";
import { index3D } from "../src/meshing/apronField";
import { handleMeshingJob } from "../src/meshing/workerHandler";
import type { MeshingJob } from "../src/shared/meshingProtocol";
import { TERRAIN_COLORS } from "../src/sim/terrain-constants";

const createApron = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

describe("meshing worker handler (TDD)", () => {
  const meshVoxel = (y: number, waterLevel: number) => {
    const size = 2;
    const materials = createApron(size);
    materials[index3D(1, 1, 1, size + 2)] = 1;
    const out = handleMeshingJob({
      t: "MESH_CHUNK",
      jobId: 1,
      rev: 1,
      chunk: { cx: 0, cy: 0, cz: 0, size },
      origin: { x: 0, y, z: 0 },
      materials,
      waterLevel,
    });
    if (out.t !== "MESH_RESULT") throw new Error(out.message);
    return out;
  };

  it("shades the sides and underside of a voxel independently of its top", () => {
    const { geometry } = meshVoxel(4, 0);
    const { colors, normals } = geometry;
    const greenByNormal = new Map<string, number>();
    for (let i = 0; i < normals.length; i += 3) {
      greenByNormal.set(normals.subarray(i, i + 3).join(","), colors![i + 1]);
    }

    expect(greenByNormal.get("0,1,0")).toBeCloseTo(new Color(TERRAIN_COLORS.GRASS).g);
    expect(greenByNormal.get("1,0,0")).toBeLessThan(greenByNormal.get("0,1,0")!);
    expect(greenByNormal.get("-1,0,0")).toBeLessThan(greenByNormal.get("1,0,0")!);
    expect(greenByNormal.get("0,-1,0")).toBeLessThan(greenByNormal.get("-1,0,0")!);
    expect(geometry.indices).toHaveLength(36);
  });

  it.each([
    [-5, TERRAIN_COLORS.DEEP_WATER],
    [0, TERRAIN_COLORS.WATER],
    [2, TERRAIN_COLORS.SAND],
    [4, TERRAIN_COLORS.GRASS],
    [8, TERRAIN_COLORS.DARK_GRASS],
    [15, TERRAIN_COLORS.ROCK],
    [22, TERRAIN_COLORS.SNOW],
  ])(
    "uses the voxel height relative to the water plane for the top at offset %i",
    (height, hex) => {
      const waterLevel = 10;
      const { geometry } = meshVoxel(waterLevel + height, waterLevel);
      const { colors, normals } = geometry;
      const i = normals.findIndex((value, index) => index % 3 === 1 && value === 1) - 1;
      const color = new Color(hex);
      expect(colors![i]).toBeCloseTo(color.r);
      expect(colors![i + 1]).toBeCloseTo(color.g);
      expect(colors![i + 2]).toBeCloseTo(color.b);
    },
  );

  it("matches fallback vertex colors at both levels of detail", () => {
    const out = meshVoxel(2, 0);
    expect(out.lods).toHaveLength(1);
    for (const geometry of [out.geometry, out.lods![0].geometry]) {
      const buffer = buildBufferGeometry({ ...geometry, colors: undefined }, 0);
      expect(buffer.getAttribute("color").array).toEqual(geometry.colors);
      buffer.dispose();
    }
  });

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
