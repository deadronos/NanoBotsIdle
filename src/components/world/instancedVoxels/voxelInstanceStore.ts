const mask32 = 0xffffffffn;

const voxelKeyBigInt = (x: number, y: number, z: number) => {
  const bx = BigInt(Math.trunc(x)) & mask32;
  const by = BigInt(Math.trunc(y)) & mask32;
  const bz = BigInt(Math.trunc(z)) & mask32;
  return bx | (by << 32n) | (bz << 64n);
};

export type VoxelInstanceStore = {
  positions: Float32Array;
  indexByKey: Map<bigint, number>;
  count: number;
  capacity: number;
};

export const createVoxelInstanceStore = (initialCapacity = 1024): VoxelInstanceStore => {
  const capacity = Math.max(1, initialCapacity);
  return {
    positions: new Float32Array(capacity * 3),
    indexByKey: new Map(),
    count: 0,
    capacity,
  };
};

const ensureCapacity = (store: VoxelInstanceStore, needed: number) => {
  if (needed <= store.capacity) return;
  const nextCapacity = Math.max(needed, Math.ceil(store.capacity * 1.5));
  const nextPositions = new Float32Array(nextCapacity * 3);
  if (store.count > 0) {
    nextPositions.set(store.positions.subarray(0, store.count * 3));
  }
  store.positions = nextPositions;
  store.capacity = nextCapacity;
};

export const addVoxelToStore = (store: VoxelInstanceStore, x: number, y: number, z: number) => {
  const key = voxelKeyBigInt(x, y, z);
  if (store.indexByKey.has(key)) return null;

  const nextCount = store.count + 1;
  ensureCapacity(store, nextCount);

  const index = store.count;
  const base = index * 3;
  store.positions[base] = x;
  store.positions[base + 1] = y;
  store.positions[base + 2] = z;
  store.indexByKey.set(key, index);
  store.count = nextCount;

  return { index, count: store.count };
};

export const removeVoxelFromStore = (
  store: VoxelInstanceStore,
  x: number,
  y: number,
  z: number,
) => {
  const key = voxelKeyBigInt(x, y, z);
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

    store.indexByKey.set(voxelKeyBigInt(lastX, lastY, lastZ), index);
    moved = { x: lastX, y: lastY, z: lastZ };
  }

  store.count -= 1;
  store.indexByKey.delete(key);

  return { index, moved, count: store.count };
};

export const clearVoxelStore = (store: VoxelInstanceStore) => {
  store.indexByKey.clear();
  store.count = 0;
};
