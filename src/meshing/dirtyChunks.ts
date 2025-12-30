export type ChunkCoord3 = { cx: number; cy: number; cz: number };

const mod = (value: number, size: number) => ((value % size) + size) % size;

const key = (c: ChunkCoord3) => `${c.cx},${c.cy},${c.cz}`;

export const getDirtyChunksForVoxelEdit = (options: {
  x: number;
  y: number;
  z: number;
  chunkSize: number;
}): ChunkCoord3[] => {
  const { x, y, z, chunkSize } = options;

  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  const cz = Math.floor(z / chunkSize);

  const lx = mod(x, chunkSize);
  const ly = mod(y, chunkSize);
  const lz = mod(z, chunkSize);

  const out: ChunkCoord3[] = [];
  const seen = new Set<string>();

  const push = (c: ChunkCoord3) => {
    const k = key(c);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };

  push({ cx, cy, cz });

  // Deterministic neighbor order: x-, x+, y-, y+, z-, z+
  if (lx === 0) push({ cx: cx - 1, cy, cz });
  if (lx === chunkSize - 1) push({ cx: cx + 1, cy, cz });
  if (ly === 0) push({ cx, cy: cy - 1, cz });
  if (ly === chunkSize - 1) push({ cx, cy: cy + 1, cz });
  if (lz === 0) push({ cx, cy, cz: cz - 1 });
  if (lz === chunkSize - 1) push({ cx, cy, cz: cz + 1 });

  return out;
};

