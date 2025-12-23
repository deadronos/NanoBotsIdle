import * as THREE from "three";

import type { Chunk, World } from "./World";
import { BlockId, BLOCKS } from "./World";

export type MeshBuffers = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
};

export type BuiltGeometry = {
  buffers: MeshBuffers;
  vertexCount: number;
  indexCount: number;
};

type Face = {
  // 4 vertices (x,y,z) each
  v: [number, number, number][];
  n: [number, number, number];
  // neighbor offset to test visibility
  o: [number, number, number];
  // uv order for the quad (will be remapped into atlas tile)
  uv: [number, number][];
  name: "px" | "nx" | "py" | "ny" | "pz" | "nz";
};

const FACES: Face[] = [
  {
    name: "px",
    v: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    n: [1, 0, 0],
    o: [1, 0, 0],
    uv: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    name: "nx",
    v: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    n: [-1, 0, 0],
    o: [-1, 0, 0],
    uv: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    name: "py",
    v: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    n: [0, 1, 0],
    o: [0, 1, 0],
    uv: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  {
    name: "ny",
    v: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    n: [0, -1, 0],
    o: [0, -1, 0],
    uv: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  {
    name: "pz",
    v: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    n: [0, 0, 1],
    o: [0, 0, 1],
    uv: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    name: "nz",
    v: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    n: [0, 0, -1],
    o: [0, 0, -1],
    uv: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
];

function isFaceVisible(
  getBlock: (x: number, y: number, z: number) => BlockId,
  x: number,
  y: number,
  z: number,
  face: Face,
  selfId: BlockId,
): boolean {
  const b = getBlock(x + face.o[0], y + face.o[1], z + face.o[2]);
  if (b === BlockId.Air) return true;
  const neighbor = BLOCKS[b];
  if (b === selfId && neighbor.transparent) return false;
  const occludes = neighbor.occludes ?? neighbor.solid;
  // Visible if neighbor does not occlude faces (water/leaves/glass/torch).
  return !occludes;
}

function tileForFace(id: BlockId, face: Face): number {
  const def = BLOCKS[id];
  const t = def.tile;
  if (face.name === "py" && t.top != null) return t.top;
  if (face.name === "ny" && t.bottom != null) return t.bottom;
  if (
    t.side != null &&
    (face.name === "px" || face.name === "nx" || face.name === "pz" || face.name === "nz")
  )
    return t.side;
  return t.all ?? 0;
}

function sampleVertexLight(
  getLight: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  face: Face,
  v: [number, number, number],
): number {
  switch (face.name) {
    case "px":
      return getLight(x + 1, y + v[1], z + v[2]);
    case "nx":
      return getLight(x - 1, y + v[1], z + v[2]);
    case "py":
      return getLight(x + v[0], y + 1, z + v[2]);
    case "ny":
      return getLight(x + v[0], y - 1, z + v[2]);
    case "pz":
      return getLight(x + v[0], y + v[1], z + 1);
    case "nz":
      return getLight(x + v[0], y + v[1], z - 1);
    default:
      return getLight(x, y, z);
  }
}

export function buildChunkGeometry(
  world: World,
  chunk: Chunk,
  buffers?: MeshBuffers,
): BuiltGeometry {
  const { x: sx, y: sy, z: sz } = chunk.size;
  const baseX = chunk.cx * sx;
  const baseZ = chunk.cz * sz;

  const meshBuffers = buffers ?? createMeshBuffers();
  let positions = meshBuffers.positions;
  let normals = meshBuffers.normals;
  let uvs = meshBuffers.uvs;
  let colors = meshBuffers.colors;
  let indices = meshBuffers.indices;

  const neighbors = {
    nx: world.getChunk(chunk.cx - 1, chunk.cz),
    px: world.getChunk(chunk.cx + 1, chunk.cz),
    nz: world.getChunk(chunk.cx, chunk.cz - 1),
    pz: world.getChunk(chunk.cx, chunk.cz + 1),
  };

  const getBlockLocal = (lx: number, ly: number, lz: number): BlockId => {
    if (ly < 0 || ly >= sy) return BlockId.Air;
    if (lx >= 0 && lx < sx && lz >= 0 && lz < sz) {
      return chunk.getLocal(lx, ly, lz);
    }

    let neighbor: Chunk | undefined;
    let nx = lx;
    let nz = lz;

    if (lx < 0) {
      neighbor = neighbors.nx;
      nx = lx + sx;
    } else if (lx >= sx) {
      neighbor = neighbors.px;
      nx = lx - sx;
    }

    if (lz < 0) {
      if (neighbor) {
        return world.getBlock(baseX + lx, ly, baseZ + lz);
      }
      neighbor = neighbors.nz;
      nz = lz + sz;
    } else if (lz >= sz) {
      if (neighbor) {
        return world.getBlock(baseX + lx, ly, baseZ + lz);
      }
      neighbor = neighbors.pz;
      nz = lz - sz;
    }

    if (!neighbor) return BlockId.Air;
    return neighbor.getLocal(nx, ly, nz);
  };

  const getLightLocal = (lx: number, ly: number, lz: number): number => {
    if (ly < 0 || ly >= sy) return 0;
    if (lx >= 0 && lx < sx && lz >= 0 && lz < sz) {
      const idx = chunk.idx(lx, ly, lz);
      return Math.max(chunk.sunLight[idx], chunk.blockLight[idx]);
    }

    let neighbor: Chunk | undefined;
    let nx = lx;
    let nz = lz;

    if (lx < 0) {
      neighbor = neighbors.nx;
      nx = lx + sx;
    } else if (lx >= sx) {
      neighbor = neighbors.px;
      nx = lx - sx;
    }

    if (lz < 0) {
      if (neighbor) {
        return world.getLightAt(baseX + lx, ly, baseZ + lz);
      }
      neighbor = neighbors.nz;
      nz = lz + sz;
    } else if (lz >= sz) {
      if (neighbor) {
        return world.getLightAt(baseX + lx, ly, baseZ + lz);
      }
      neighbor = neighbors.pz;
      nz = lz - sz;
    }

    if (!neighbor) return 0;
    const idx = neighbor.idx(nx, ly, nz);
    return Math.max(neighbor.sunLight[idx], neighbor.blockLight[idx]);
  };

  const tilesPerRow = 16; // must match atlas.ts
  const tileSize = 1 / tilesPerRow;

  let vertCount = 0;
  let posIndex = 0;
  let normIndex = 0;
  let uvIndex = 0;
  let colorIndex = 0;
  let indexIndex = 0;

  for (let y = 0; y < sy; y++) {
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const id = chunk.getLocal(x, y, z);
        if (id === BlockId.Air) continue;
        const def = BLOCKS[id];
        const wx = baseX + x;
        const wz = baseZ + z;

        for (const face of FACES) {
          if (def.renderFaces === "top" && face.name !== "py") continue;
          if (!isFaceVisible(getBlockLocal, x, y, z, face, id)) continue;

          const tile = tileForFace(id, face);
          const tx = tile % tilesPerRow;
          const ty = Math.floor(tile / tilesPerRow);

          positions = ensureFloatCapacity(positions, posIndex + 12);
          normals = ensureFloatCapacity(normals, normIndex + 12);
          uvs = ensureFloatCapacity(uvs, uvIndex + 8);
          colors = ensureFloatCapacity(colors, colorIndex + 12);
          indices = ensureIndexCapacity(indices, indexIndex + 6);

          for (let i = 0; i < 4; i++) {
            const v = face.v[i]!;
            positions[posIndex++] = wx + v[0];
            positions[posIndex++] = y + v[1];
            positions[posIndex++] = wz + v[2];
            normals[normIndex++] = face.n[0];
            normals[normIndex++] = face.n[1];
            normals[normIndex++] = face.n[2];

            const uv = face.uv[i]!;
            // Atlas UV: add tiny inset to reduce bleeding.
            const inset = 0.001;
            const u = (tx + THREE.MathUtils.lerp(inset, 1 - inset, uv[0])) * tileSize;
            const vv = (ty + THREE.MathUtils.lerp(inset, 1 - inset, uv[1])) * tileSize;
            uvs[uvIndex++] = u;
            uvs[uvIndex++] = 1 - vv;

            const light = sampleVertexLight(getLightLocal, x, y, z, face, v);
            const brightness = light / 15;
            colors[colorIndex++] = brightness;
            colors[colorIndex++] = brightness;
            colors[colorIndex++] = brightness;
          }

          // Two triangles: 0-1-2, 0-2-3
          indices[indexIndex++] = vertCount + 0;
          indices[indexIndex++] = vertCount + 1;
          indices[indexIndex++] = vertCount + 2;
          indices[indexIndex++] = vertCount + 0;
          indices[indexIndex++] = vertCount + 2;
          indices[indexIndex++] = vertCount + 3;

          vertCount += 4;
        }
      }
    }
  }

  meshBuffers.positions = positions;
  meshBuffers.normals = normals;
  meshBuffers.uvs = uvs;
  meshBuffers.colors = colors;
  meshBuffers.indices = indices;

  return { buffers: meshBuffers, vertexCount: vertCount, indexCount: indexIndex };
}

function createMeshBuffers(): MeshBuffers {
  const initialFaces = 1024;
  const initialVertices = initialFaces * 4;
  return {
    positions: new Float32Array(initialVertices * 3),
    normals: new Float32Array(initialVertices * 3),
    uvs: new Float32Array(initialVertices * 2),
    colors: new Float32Array(initialVertices * 3),
    indices: new Uint32Array(initialFaces * 6),
  };
}

function ensureFloatCapacity(buffer: Float32Array, required: number): Float32Array {
  if (buffer.length >= required) return buffer;
  let size = buffer.length > 0 ? buffer.length : 1;
  while (size < required) size *= 2;
  const next = new Float32Array(size);
  next.set(buffer);
  return next;
}

function ensureIndexCapacity(buffer: Uint32Array, required: number): Uint32Array {
  if (buffer.length >= required) return buffer;
  let size = buffer.length > 0 ? buffer.length : 1;
  while (size < required) size *= 2;
  const next = new Uint32Array(size);
  next.set(buffer);
  return next;
}
