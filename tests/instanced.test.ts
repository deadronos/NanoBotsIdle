import type { Color,InstancedMesh } from "three";
import { describe, expect, it, vi } from "vitest";

import * as I from "../src/render/instanced";

describe("instanced helpers API (TDD)", () => {
  it("exports helper functions", () => {
    expect(typeof I.setInstanceTransform).toBe("function");
    expect(typeof I.setInstanceColor).toBe("function");
    expect(typeof I.applyInstanceUpdates).toBe("function");
  });

  it("setInstanceTransform calls setMatrixAt and marks instanceMatrix.needsUpdate", () => {
    const mesh = {
      setMatrixAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
    } as unknown as InstancedMesh;

    I.setInstanceTransform(mesh, 2, { position: { x: 1, y: 2, z: 3 }, scale: { x: 1, y: 1, z: 1 } });

    expect(mesh.setMatrixAt).toHaveBeenCalled();
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
  });

  it("setInstanceColor calls setColorAt and marks instanceColor.needsUpdate when present", () => {
    const mesh = {
      setColorAt: vi.fn(),
      instanceColor: { needsUpdate: false },
    } as unknown as InstancedMesh;
    const color = { r: 1, g: 0.5, b: 0 } as unknown as Color;

    I.setInstanceColor(mesh, 5, color);

    expect(mesh.setColorAt).toHaveBeenCalled();
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });

  it("applyInstanceUpdates toggles flags", () => {
    const mesh = {
      instanceMatrix: { needsUpdate: false },
      instanceColor: { needsUpdate: false },
    } as unknown as InstancedMesh;

    I.applyInstanceUpdates(mesh, { matrix: true, color: false });
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    expect(mesh.instanceColor!.needsUpdate).toBe(false);

    I.applyInstanceUpdates(mesh, { color: true });
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });
});
