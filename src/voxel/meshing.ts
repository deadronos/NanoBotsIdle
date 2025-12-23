import * as THREE from "three";

import type { Chunk, World } from "./World";
import { BlockId, BLOCKS } from "./World";

export type BuiltGeometry = {
  geometry: THREE.BufferGeometry;
  vertexCount: number;
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
  world: World,
  wx: number,
  wy: number,
  wz: number,
  nx: number,
  ny: number,
  nz: number,
  selfId: BlockId,
): boolean {
  const b = world.getBlock(wx + nx, wy + ny, wz + nz);
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

export function buildChunkGeometry(world: World, chunk: Chunk): BuiltGeometry {
  const { x: sx, y: sy, z: sz } = chunk.size;
  const baseX = chunk.cx * sx;
  const baseZ = chunk.cz * sz;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tilesPerRow = 16; // must match atlas.ts
  const tileSize = 1 / tilesPerRow;

  let vertCount = 0;

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
          if (!isFaceVisible(world, wx, y, wz, face.o[0], face.o[1], face.o[2], id)) continue;

          const tile = tileForFace(id, face);
          const tx = tile % tilesPerRow;
          const ty = Math.floor(tile / tilesPerRow);

          for (let i = 0; i < 4; i++) {
            const v = face.v[i]!;
            positions.push(wx + v[0], y + v[1], wz + v[2]);
            normals.push(face.n[0], face.n[1], face.n[2]);

            const uv = face.uv[i]!;
            // Atlas UV: add tiny inset to reduce bleeding.
            const inset = 0.001;
            const u = (tx + THREE.MathUtils.lerp(inset, 1 - inset, uv[0])) * tileSize;
            const vv = (ty + THREE.MathUtils.lerp(inset, 1 - inset, uv[1])) * tileSize;
            uvs.push(u, 1 - vv);
          }

          // Two triangles: 0-1-2, 0-2-3
          indices.push(
            vertCount + 0,
            vertCount + 1,
            vertCount + 2,
            vertCount + 0,
            vertCount + 2,
            vertCount + 3,
          );

          vertCount += 4;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return { geometry, vertexCount: vertCount };
}
