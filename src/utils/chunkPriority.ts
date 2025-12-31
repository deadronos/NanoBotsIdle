export type ChunkCoord3 = { cx: number; cy: number; cz: number };
export type ChunkCoord2 = { cx: number; cz: number };

export type RadialOffset3 = { dx: number; dy: number; dz: number };

export type RadialDims = 2 | 3;

export const chunkDistanceSq3 = (coord: ChunkCoord3, focus: ChunkCoord3): number => {
  const dx = coord.cx - focus.cx;
  const dy = coord.cy - focus.cy;
  const dz = coord.cz - focus.cz;
  return dx * dx + dy * dy + dz * dz;
};

export const chunkDistanceSq2 = (coord: ChunkCoord2, focus: ChunkCoord2): number => {
  const dx = coord.cx - focus.cx;
  const dz = coord.cz - focus.cz;
  return dx * dx + dz * dz;
};

// Generate offsets within a cube of radius sorted by squared distance ascending.
// dims = 3 (default) includes x,y,z; dims = 2 uses only x,z (y=0) for horizontal scans.
export const generateRadialOffsets = (radius: number, dims = 3): RadialOffset3[] => {
  const offsets: RadialOffset3[] = [];
  const min = -radius;
  const max = radius;

  for (let dx = min; dx <= max; dx++) {
    for (let dz = min; dz <= max; dz++) {
      if (dims === 2) {
        offsets.push({ dx, dy: 0, dz });
      } else {
        for (let dy = min; dy <= max; dy++) {
          offsets.push({ dx, dy, dz });
        }
      }
    }
  }

  offsets.sort((a, b) => {
    const da = a.dx * a.dx + a.dy * a.dy + a.dz * a.dz;
    const db = b.dx * b.dx + b.dy * b.dy + b.dz * b.dz;
    if (da !== db) return da - db;
    // tie-break deterministically: by dx, then dy, then dz
    if (a.dx !== b.dx) return a.dx - b.dx;
    if (a.dy !== b.dy) return a.dy - b.dy;
    return a.dz - b.dz;
  });

  return offsets;
};

export const forEachRadialChunk = (
  center: ChunkCoord3,
  radius: number,
  dims: RadialDims,
  visit: (coord: ChunkCoord3, offset: RadialOffset3) => void,
) => {
  const offsets = generateRadialOffsets(radius, dims);
  for (const off of offsets) {
    visit(
      {
        cx: center.cx + off.dx,
        cy: center.cy + off.dy,
        cz: center.cz + off.dz,
      },
      off,
    );
  }
};
