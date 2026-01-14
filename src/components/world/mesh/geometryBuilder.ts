import { BufferAttribute, BufferGeometry, Color, Sphere, Vector3 } from "three";

import type { MeshResult } from "../../../shared/meshingProtocol";
import { TERRAIN_COLORS, TERRAIN_THRESHOLDS } from "../../../sim/terrain-constants";

const deepWater = new Color(TERRAIN_COLORS.DEEP_WATER);
const water = new Color(TERRAIN_COLORS.WATER);
const sand = new Color(TERRAIN_COLORS.SAND);
const grass = new Color(TERRAIN_COLORS.GRASS);
const darkGrass = new Color(TERRAIN_COLORS.DARK_GRASS);
const rock = new Color(TERRAIN_COLORS.ROCK);
const snow = new Color(TERRAIN_COLORS.SNOW);

export const writeVertexColor = (
  out: Float32Array,
  base: number,
  y: number,
  waterLevel: number,
) => {
  let c: Color;
  if (y < waterLevel + TERRAIN_THRESHOLDS.DEEP_WATER) c = deepWater;
  else if (y < waterLevel + TERRAIN_THRESHOLDS.WATER) c = water;
  else if (y < waterLevel + TERRAIN_THRESHOLDS.SAND) c = sand;
  else if (y < waterLevel + TERRAIN_THRESHOLDS.GRASS) c = grass;
  else if (y < waterLevel + TERRAIN_THRESHOLDS.DARK_GRASS) c = darkGrass;
  else if (y < waterLevel + TERRAIN_THRESHOLDS.ROCK) c = rock;
  else c = snow;
  out[base] = c.r;
  out[base + 1] = c.g;
  out[base + 2] = c.b;
};

export const buildBufferGeometry = (
  geometry: MeshResult["geometry"],
  waterLevel: number,
): BufferGeometry => {
  const buffer = new BufferGeometry();
  buffer.setAttribute("position", new BufferAttribute(geometry.positions, 3));
  buffer.setAttribute("normal", new BufferAttribute(geometry.normals, 3));

  if (geometry.colors && geometry.colors.length === geometry.positions.length) {
    buffer.setAttribute("color", new BufferAttribute(geometry.colors, 3));
  } else {
    const colors = new Float32Array(geometry.positions.length);
    for (let i = 0; i < geometry.positions.length; i += 3) {
      // positions are already in world coordinates
      writeVertexColor(colors, i, geometry.positions[i + 1], waterLevel);
    }
    buffer.setAttribute("color", new BufferAttribute(colors, 3));
  }

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
