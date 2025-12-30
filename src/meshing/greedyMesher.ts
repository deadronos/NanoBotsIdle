import { index3D } from "./apronField";
import type { GreedyMeshInput, MeshGeometry } from "./meshTypes";

const MATERIAL_AIR = 0;

const chooseIndexArray = (vertexCount: number, indices: number[]) => {
  if (vertexCount > 65535) return Uint32Array.from(indices);
  return Uint16Array.from(indices);
};

export const greedyMeshChunk = (input: GreedyMeshInput): MeshGeometry => {
  const { size, origin, materials } = input;

  const dim = size + 2;
  const expectedLen = dim * dim * dim;
  if (materials.length !== expectedLen) {
    throw new Error(
      `greedyMeshChunk: expected materials.length=${expectedLen}, got ${materials.length}`,
    );
  }

  const getMat = (x: number, y: number, z: number) => {
    // x/y/z are in [-1 .. size]
    return materials[index3D(x + 1, y + 1, z + 1, dim)];
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const pushVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    const index = positions.length / 3;
    positions.push(origin.x + x, origin.y + y, origin.z + z);
    normals.push(nx, ny, nz);
    return index;
  };

  const dims = [size, size, size] as const;
  const x = [0, 0, 0];
  const q = [0, 0, 0];

  for (let d = 0; d < 3; d += 1) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;

    q[0] = 0;
    q[1] = 0;
    q[2] = 0;
    q[d] = 1;

    const maskW = dims[u];
    const maskH = dims[v];
    const mask = new Int16Array(maskW * maskH);

    for (x[d] = -1; x[d] < dims[d]; x[d] += 1) {
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; x[v] += 1) {
        for (x[u] = 0; x[u] < dims[u]; x[u] += 1) {
          const ax = x[0];
          const ay = x[1];
          const az = x[2];
          const a = getMat(ax, ay, az);
          const b = getMat(ax + q[0], ay + q[1], az + q[2]);

          // Avoid emitting faces for solids that are only present in the apron.
          // We only own faces whose solid voxel lies within the chunk interior.
          const slice = x[d];

          if (a !== MATERIAL_AIR && b === MATERIAL_AIR) {
            // solid is `a` at coordinate slice
            mask[n] = slice < 0 ? 0 : a;
          } else if (b !== MATERIAL_AIR && a === MATERIAL_AIR) {
            // solid is `b` at coordinate slice+1
            mask[n] = slice >= dims[d] - 1 ? 0 : -b;
          } else {
            mask[n] = 0;
          }
          n += 1;
        }
      }

      n = 0;
      for (let j = 0; j < maskH; j += 1) {
        for (let i = 0; i < maskW; ) {
          const c = mask[n];
          if (c === 0) {
            i += 1;
            n += 1;
            continue;
          }

          // width
          let w = 1;
          while (i + w < maskW && mask[n + w] === c) w += 1;

          // height
          let h = 1;
          outer: while (j + h < maskH) {
            const row = n + h * maskW;
            for (let k = 0; k < w; k += 1) {
              if (mask[row + k] !== c) break outer;
            }
            h += 1;
          }

          // emit quad
          const plane = x[d] + 1;
          const base = [0, 0, 0];
          base[d] = plane;
          base[u] = i;
          base[v] = j;

          const du = [0, 0, 0];
          const dv = [0, 0, 0];
          du[u] = w;
          dv[v] = h;

          const sign = c > 0 ? 1 : -1;
          const nx = d === 0 ? sign : 0;
          const ny = d === 1 ? sign : 0;
          const nz = d === 2 ? sign : 0;

          const v0 = { x: base[0], y: base[1], z: base[2] };
          const v1 = { x: base[0] + du[0], y: base[1] + du[1], z: base[2] + du[2] };
          const v2 = {
            x: base[0] + du[0] + dv[0],
            y: base[1] + du[1] + dv[1],
            z: base[2] + du[2] + dv[2],
          };
          const v3 = { x: base[0] + dv[0], y: base[1] + dv[1], z: base[2] + dv[2] };

          const verts = sign > 0 ? [v0, v1, v2, v3] : [v0, v3, v2, v1];
          const baseIndex = pushVertex(verts[0].x, verts[0].y, verts[0].z, nx, ny, nz);
          pushVertex(verts[1].x, verts[1].y, verts[1].z, nx, ny, nz);
          pushVertex(verts[2].x, verts[2].y, verts[2].z, nx, ny, nz);
          pushVertex(verts[3].x, verts[3].y, verts[3].z, nx, ny, nz);

          indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);

          // clear mask rect
          for (let y = 0; y < h; y += 1) {
            const row = n + y * maskW;
            for (let k = 0; k < w; k += 1) {
              mask[row + k] = 0;
            }
          }

          i += w;
          n += w;
        }
      }
    }
  }

  const positionsTyped = new Float32Array(positions);
  const normalsTyped = new Float32Array(normals);
  const indicesTyped = chooseIndexArray(positionsTyped.length / 3, indices);

  return {
    positions: positionsTyped,
    normals: normalsTyped,
    indices: indicesTyped,
  };
};

export const __testing = {
  chooseIndexArray,
};

