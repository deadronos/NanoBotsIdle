export type MaterialAt = (x: number, y: number, z: number) => number;

export type ChunkOrigin = { x: number; y: number; z: number };

export const index3D = (x: number, y: number, z: number, dim: number) => {
  return x + y * dim + z * dim * dim;
};

export const createApronField = (size: number) => {
  const dim = size + 2;
  return new Uint8Array(dim * dim * dim);
};

export const fillApronField = (
  out: Uint8Array,
  options: {
    size: number;
    origin: ChunkOrigin;
    materialAt: MaterialAt;
  },
) => {
  const { size, origin, materialAt } = options;
  const dim = size + 2;
  const expectedLen = dim * dim * dim;
  if (out.length !== expectedLen) {
    throw new Error(`fillApronField: expected out.length=${expectedLen}, got ${out.length}`);
  }

  let idx = 0;
  for (let lz = 0; lz < dim; lz += 1) {
    const wz = origin.z + (lz - 1);
    for (let ly = 0; ly < dim; ly += 1) {
      const wy = origin.y + (ly - 1);
      for (let lx = 0; lx < dim; lx += 1) {
        const wx = origin.x + (lx - 1);
        out[idx] = materialAt(wx, wy, wz) & 0xff;
        idx += 1;
      }
    }
  }
};

