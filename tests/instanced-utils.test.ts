import type { InstancedMesh } from "three";
import { Color } from "three";
import { describe, expect, it, vi } from "vitest";

import { populateInstancedMesh } from "../src/render/instanced";

describe("populateInstancedMesh (TDD)", () => {
  it("should set matrix and color for each instance and mark needsUpdate flags", () => {
    const mesh = {
      setMatrixAt: vi.fn(),
      setColorAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
      instanceColor: { needsUpdate: false },
    } as unknown as InstancedMesh;

    const instances = [
      { x: 0, y: 1, z: 0, color: new Color(1, 0, 0), value: 2 },
      { x: 1, y: 2, z: 1, color: new Color(0, 1, 0), value: 5 },
    ];

    populateInstancedMesh(mesh, instances);

    expect(mesh.setMatrixAt).toHaveBeenCalledTimes(instances.length);
    expect(mesh.setColorAt).toHaveBeenCalledTimes(instances.length);
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });
});
