import { voxelKey } from "../../../shared/voxel";

export type VoxelInstanceStore = {
  positions: number[];
  indexByKey: Map<string, number>;
  count: number;
};

export const createVoxelInstanceStore = (): VoxelInstanceStore => {
  return { positions: [], indexByKey: new Map(), count: 0 };
};

export const addVoxelToStore = (store: VoxelInstanceStore, x: number, y: number, z: number) => {
  const key = voxelKey(x, y, z);
  if (store.indexByKey.has(key)) return null;

  const index = store.count;
  store.indexByKey.set(key, index);
  store.positions.push(x, y, z);
  store.count += 1;

  return { index, count: store.count };
};

export const removeVoxelFromStore = (
  store: VoxelInstanceStore,
  x: number,
  y: number,
  z: number,
) => {
  const key = voxelKey(x, y, z);
  const index = store.indexByKey.get(key);
  if (index === undefined) return null;

  const lastIndex = store.count - 1;

  let moved: { x: number; y: number; z: number } | null = null;

  if (index !== lastIndex) {
    const positions = store.positions;
    const lastBase = lastIndex * 3;
    const lastX = positions[lastBase];
    const lastY = positions[lastBase + 1];
    const lastZ = positions[lastBase + 2];

    positions[index * 3] = lastX;
    positions[index * 3 + 1] = lastY;
    positions[index * 3 + 2] = lastZ;

    store.indexByKey.set(voxelKey(lastX, lastY, lastZ), index);
    moved = { x: lastX, y: lastY, z: lastZ };
  }

  store.positions.length -= 3;
  store.count -= 1;
  store.indexByKey.delete(key);

  return { index, moved, count: store.count };
};

export const clearVoxelStore = (store: VoxelInstanceStore) => {
  store.positions.length = 0;
  store.indexByKey.clear();
  store.count = 0;
};
