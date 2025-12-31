import { describe, expect, it } from "vitest";

import {
  addVoxelToStore,
  createVoxelInstanceStore,
  removeVoxelFromStore,
} from "../src/components/world/instancedVoxels/voxelInstanceStore";

describe("voxel instance store (swap-with-last)", () => {
  it("does not add duplicate keys", () => {
    const store = createVoxelInstanceStore();

    const first = addVoxelToStore(store, 1, 2, 3);
    const dup = addVoxelToStore(store, 1, 2, 3);

    expect(first).not.toBeNull();
    expect(dup).toBeNull();
    expect(store.count).toBe(1);
    expect(store.positions).toEqual([1, 2, 3]);
  });

  it("removes using swap-with-last and keeps indices consistent", () => {
    const store = createVoxelInstanceStore();

    addVoxelToStore(store, 0, 0, 0);
    addVoxelToStore(store, 10, 0, 0);
    addVoxelToStore(store, 20, 0, 0);

    const removed = removeVoxelFromStore(store, 10, 0, 0);

    expect(removed).not.toBeNull();
    expect(store.count).toBe(2);
    expect(store.positions.length).toBe(6);

    // The last item should have been moved into the removed slot.
    expect(removed?.moved).toEqual({ x: 20, y: 0, z: 0 });

    // Store must still be able to remove both remaining voxels by coords.
    expect(removeVoxelFromStore(store, 0, 0, 0)).not.toBeNull();
    expect(removeVoxelFromStore(store, 20, 0, 0)).not.toBeNull();
    expect(store.count).toBe(0);
    expect(store.positions).toEqual([]);
  });
});
