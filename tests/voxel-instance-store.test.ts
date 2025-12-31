import { describe, expect, it } from "vitest";

import {
  addVoxelToStore,
  clearVoxelStore,
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
    expect(Array.from(store.positions.subarray(0, store.count * 3))).toEqual([1, 2, 3]);
  });

  it("removes using swap-with-last and keeps indices consistent", () => {
    const store = createVoxelInstanceStore();

    addVoxelToStore(store, 0, 0, 0);
    addVoxelToStore(store, 10, 0, 0);
    addVoxelToStore(store, 20, 0, 0);

    const removed = removeVoxelFromStore(store, 10, 0, 0);

    expect(removed).not.toBeNull();
    expect(store.count).toBe(2);
    expect(store.positions.subarray(0, store.count * 3)).toHaveLength(6);

    // The last item should have been moved into the removed slot.
    expect(removed?.moved).toEqual({ x: 20, y: 0, z: 0 });

    // Store must still be able to remove both remaining voxels by coords.
    expect(removeVoxelFromStore(store, 0, 0, 0)).not.toBeNull();
    expect(removeVoxelFromStore(store, 20, 0, 0)).not.toBeNull();
    expect(store.count).toBe(0);
    expect(store.positions.subarray(0, store.count * 3)).toHaveLength(0);
  });

  it("grows capacity and preserves existing positions", () => {
    const store = createVoxelInstanceStore(1);

    expect(store.capacity).toBe(1);
    addVoxelToStore(store, 1, 1, 1);

    // Adding a second voxel forces growth (capacity stores voxel count, not float count)
    addVoxelToStore(store, 2, 2, 2);

    expect(store.capacity).toBeGreaterThanOrEqual(2);
    expect(store.count).toBe(2);
    expect(Array.from(store.positions.subarray(0, store.count * 3))).toEqual([
      1, 1, 1, 2, 2, 2,
    ]);
  });

  it("removing the last voxel returns null moved", () => {
    const store = createVoxelInstanceStore();

    addVoxelToStore(store, 1, 2, 3);
    addVoxelToStore(store, 4, 5, 6);

    const removed = removeVoxelFromStore(store, 4, 5, 6);
    expect(removed).not.toBeNull();
    expect(removed?.moved).toBeNull();
    expect(store.count).toBe(1);
  });

  it("clear resets count and index map", () => {
    const store = createVoxelInstanceStore();
    addVoxelToStore(store, 1, 2, 3);
    addVoxelToStore(store, 4, 5, 6);

    clearVoxelStore(store);

    expect(store.count).toBe(0);
    expect(store.indexByKey.size).toBe(0);
  });
});
