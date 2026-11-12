import type { MeshingJob } from "../shared/meshingProtocol";
import { getVoxelColor } from "../sim/terrain-constants";
import { index3D } from "./apronField";
import type { MeshGeometry } from "./meshTypes";

// Three.js reads vertex colors in linear sRGB. Convert byte values once per module.
const linearChannel = Float32Array.from({ length: 256 }, (_, byte) => {
  const srgb = byte / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
});

const faceShade = (x: number, y: number, z: number): number => {
  if (y > 0) return 1;
  if (y < 0) return 0.62;
  if (x > 0) return 0.92;
  if (x < 0) return 0.75;
  return z > 0 ? 0.86 : 0.78;
};

export const buildTerrainVertexColors = (
  { positions, normals }: Pick<MeshGeometry, "positions" | "normals">,
  waterLevel: number,
  field?: Pick<MeshingJob, "origin" | "chunk" | "materials">,
): Float32Array => {
  const colors = new Float32Array(positions.length);
  const dim = (field?.chunk.size ?? 0) + 2;
  const solid = (x: number, y: number, z: number): number => {
    if (!field || x < 0 || y < 0 || z < 0 || x >= dim || y >= dim || z >= dim) return 0;
    return field.materials[index3D(x, y, z, dim)] ? 1 : 0;
  };
  for (let i = 0; i < positions.length; i += 3) {
    const ny = normals[i + 1];
    // Upward faces sit one unit above the highest voxel layer they represent.
    const hex = getVoxelColor(positions[i + 1] - (ny > 0 ? 1 : 0), waterLevel);
    const nx = normals[i];
    const nz = normals[i + 2];
    let shade = faceShade(nx, ny, nz);
    if (field) {
      // Count occupied cells touching this corner on the air side of the face.
      // The samples depend on the world corner and normal, so adjacent chunks agree.
      const x = positions[i] - field.origin.x + (nx < 0 ? 0 : 1);
      const y = positions[i + 1] - field.origin.y + (ny < 0 ? 0 : 1);
      const z = positions[i + 2] - field.origin.z + (nz < 0 ? 0 : 1);
      const ax = nx === 0 ? 1 : 0;
      const ay = ny === 0 ? 1 : 0;
      const az = nz === 0 ? 1 : 0;
      const occupied =
        solid(x, y, z) +
        solid(x - ax, y - ay, z - az) +
        (nx !== 0 ? solid(x, y - 1, z) + solid(x, y, z - 1)
        : ny !== 0 ? solid(x - 1, y, z) + solid(x, y, z - 1)
        : solid(x - 1, y, z) + solid(x, y - 1, z));
      shade *= 1 - occupied * 0.055;
    }
    colors[i] = linearChannel[(hex >> 16) & 0xff] * shade;
    colors[i + 1] = linearChannel[(hex >> 8) & 0xff] * shade;
    colors[i + 2] = linearChannel[hex & 0xff] * shade;
  }
  return colors;
};
