import { describe, expect, it } from "vitest";

import { getDirtyChunksForVoxelEdit } from "../src/meshing/dirtyChunks";

describe("dirty chunk routing (TDD)", () => {
  it("should only dirty the owning chunk for an interior edit", () => {
    const chunks = getDirtyChunksForVoxelEdit({ x: 5, y: 6, z: 7, chunkSize: 16 });
    expect(chunks).toEqual([{ cx: 0, cy: 0, cz: 0 }]);
  });

  it("should dirty the neighbor chunk for an x- boundary edit", () => {
    const chunks = getDirtyChunksForVoxelEdit({ x: 0, y: 6, z: 7, chunkSize: 16 });
    expect(chunks).toEqual([
      { cx: 0, cy: 0, cz: 0 },
      { cx: -1, cy: 0, cz: 0 },
    ]);
  });

  it("should dirty the neighbor chunk for an x+ boundary edit", () => {
    const chunks = getDirtyChunksForVoxelEdit({ x: 15, y: 6, z: 7, chunkSize: 16 });
    expect(chunks).toEqual([
      { cx: 0, cy: 0, cz: 0 },
      { cx: 1, cy: 0, cz: 0 },
    ]);
  });
});
