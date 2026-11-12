import { index3D } from "./apronField";

/** Approximate interior cells while retaining the original apron and boundary voxels. */
export const coarsenInterior = (materials: Uint8Array, size: number): Uint8Array => {
  const result = materials.slice();
  const dim = size + 2;
  // Coordinates are in the padded field. Interior blocks start after the apron and shell.
  for (let z = 2; z + 1 < size; z += 2) {
    for (let y = 2; y + 1 < size; y += 2) {
      for (let x = 2; x + 1 < size; x += 2) {
        let solid = 0;
        for (let dz = 0; dz < 2; dz++) {
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              solid = Math.max(solid, materials[index3D(x + dx, y + dy, z + dz, dim)]);
            }
          }
        }
        for (let dz = 0; dz < 2; dz++) {
          for (let dy = 0; dy < 2; dy++) {
            const start = index3D(x, y + dy, z + dz, dim);
            result.fill(solid, start, start + 2);
          }
        }
      }
    }
  }
  return result;
};
