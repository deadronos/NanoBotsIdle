import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from "three";

import { buildTerrainVertexColors } from "../../../meshing/terrainVertexColors";
import type { MeshResult } from "../../../shared/meshingProtocol";

export const buildBufferGeometry = (
  geometry: MeshResult["geometry"],
  waterLevel: number,
): BufferGeometry => {
  const buffer = new BufferGeometry();
  buffer.setAttribute("position", new BufferAttribute(geometry.positions, 3));
  buffer.setAttribute("normal", new BufferAttribute(geometry.normals, 3));

  const colors =
    geometry.colors?.length === geometry.positions.length ?
      geometry.colors
    : buildTerrainVertexColors(geometry, waterLevel);
  buffer.setAttribute("color", new BufferAttribute(colors, 3));

  buffer.setIndex(new BufferAttribute(geometry.indices, 1));

  // Use pre-computed bounding sphere from worker if available (performance optimization)
  if (geometry.boundingSphere) {
    const { center, radius } = geometry.boundingSphere;
    buffer.boundingSphere = new Sphere(new Vector3(center.x, center.y, center.z), radius);
  } else {
    // Fallback to computing on main thread if not provided
    buffer.computeBoundingSphere();
  }

  return buffer;
};
