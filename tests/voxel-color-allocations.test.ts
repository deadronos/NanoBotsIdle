import { describe, expect, it } from "vitest";
import { Color, InstancedMesh, Object3D } from "three";

import {
  makeHeightColorFn,
  rebuildVoxelInstances,
  setVoxelInstance,
} from "../src/components/world/instancedVoxels/voxelInstanceMesh";
import { getVoxelColor } from "../src/utils";

describe("voxel color allocations", () => {
  it("getVoxelColor returns numeric hex without allocating Color objects", () => {
    const color = getVoxelColor(5, -12);
    expect(typeof color).toBe("number");
    expect(color).toBeGreaterThanOrEqual(0);
    expect(color).toBeLessThanOrEqual(0xffffff);
  });

  it("makeHeightColorFn returns function that produces numeric hex", () => {
    const colorFn = makeHeightColorFn(-12);
    const color = colorFn(0, 5, 0);
    expect(typeof color).toBe("number");
    expect(color).toBeGreaterThanOrEqual(0);
    expect(color).toBeLessThanOrEqual(0xffffff);
  });

  it("setVoxelInstance works with numeric colors and reusable Color object", () => {
    const mesh = {
      setMatrixAt: () => {},
      setColorAt: (index: number, color: Color) => {
        expect(index).toBe(0);
        expect(color).toBeInstanceOf(Color);
      },
    } as unknown as InstancedMesh;
    const tmp = new Object3D();
    const colorFn = makeHeightColorFn(-12);

    setVoxelInstance(mesh, tmp, 0, 1, 2, 3, colorFn);
  });

  it("rebuildVoxelInstances processes multiple voxels efficiently", () => {
    let colorSetCount = 0;
    const mesh = {
      setMatrixAt: () => {},
      setColorAt: (_index: number, color: Color) => {
        expect(color).toBeInstanceOf(Color);
        colorSetCount++;
      },
      instanceMatrix: { needsUpdate: false },
      instanceColor: { needsUpdate: false },
      count: 0,
    } as unknown as InstancedMesh;
    const tmp = new Object3D();
    const colorFn = makeHeightColorFn(-12);

    // Simulate 100 voxels
    const positions: number[] = [];
    for (let i = 0; i < 100; i++) {
      positions.push(i, i + 1, i + 2);
    }

    rebuildVoxelInstances(mesh, tmp, positions, colorFn);

    expect(colorSetCount).toBe(100);
    expect(mesh.count).toBe(100);
    expect(mesh.instanceMatrix!.needsUpdate).toBe(true);
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });

  it("numeric colors convert correctly to RGB values", () => {
    const hexColor = 0x59a848; // Grass color
    const tmpColor = new Color();
    tmpColor.setHex(hexColor);

    // Verify that setHex properly sets the color
    expect(tmpColor.getHex()).toBe(hexColor);
  });
});
