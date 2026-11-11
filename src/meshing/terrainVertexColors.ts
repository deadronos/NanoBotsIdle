import { getVoxelColor } from "../sim/terrain-constants";
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
): Float32Array => {
  const colors = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const ny = normals[i + 1];
    // Upward faces sit one unit above the highest voxel layer they represent.
    const hex = getVoxelColor(positions[i + 1] - (ny > 0 ? 1 : 0), waterLevel);
    const shade = faceShade(normals[i], ny, normals[i + 2]);
    colors[i] = linearChannel[(hex >> 16) & 0xff] * shade;
    colors[i + 1] = linearChannel[(hex >> 8) & 0xff] * shade;
    colors[i + 2] = linearChannel[hex & 0xff] * shade;
  }
  return colors;
};
