import { describe, test, expect } from "vitest";
import { MeshingScheduler } from "../src/meshing/meshingScheduler";
import { generateRadialOffsets } from "../src/utils";

describe("MeshingScheduler dirty keys insertion order", () => {
  test("maintains insertion order when markDirty is called in radial order (2D)", () => {
    // Minimal mock worker
    const worker = {
      postMessage: () => {},
      addEventListener: (_: any, __: any) => {},
      removeEventListener: (_: any, __: any) => {},
      terminate: () => {},
    } as any;

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      buildJob: () => ({ msg: { t: "MESH_CHUNK" } as any, transfer: [] }),
      onApply: () => {},
      maxInFlight: 1,
    });

    const baseCx = 10;
    const baseCz = 20;
    const offsets = generateRadialOffsets(2, 2);

    for (const off of offsets) {
      scheduler.markDirty({ cx: baseCx + off.dx, cy: 0 + off.dy, cz: baseCz + off.dz });
    }

    const dirtyKeys = scheduler.getDirtyKeys();
    const expected = offsets.map((o) => `${baseCx + o.dx},${0 + o.dy},${baseCz + o.dz}`);

    expect(dirtyKeys).toEqual(expected);
  });
});
