import { describe, expect, it } from "vitest";

import { coordsFromVoxelKey, MATERIAL_AIR, MATERIAL_SOLID, voxelKey } from "../src/shared/voxel";
import { VoxelEditStore } from "../src/shared/voxelEdits";

describe("voxel keys (BVX-backed)", () => {
  it("round-trips world coordinates through voxelKey", () => {
    const original = { x: -12, y: -4, z: 25 };
    const key = voxelKey(original.x, original.y, original.z);
    const decoded = coordsFromVoxelKey(key);
    expect(decoded).toEqual(original);
  });

  it("tracks air edits in the BVX-backed edit store", () => {
    const store = new VoxelEditStore();
    store.setMaterial(2, -3, 4, MATERIAL_AIR);
    expect(store.hasAirEdit(2, -3, 4)).toBe(true);

    store.setMaterial(2, -3, 4, MATERIAL_SOLID);
    expect(store.hasAirEdit(2, -3, 4)).toBe(false);
  });
});
