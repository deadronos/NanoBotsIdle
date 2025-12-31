import type { BufferGeometry, Mesh } from "three";

import type { LodLevel } from "./lodUtils";

export type LodGeometries = {
  high: BufferGeometry;
  low?: BufferGeometry;
};

export const applyLodGeometry = (mesh: Mesh, lod: LodLevel) => {
  const geometries = mesh.userData.lodGeometries as LodGeometries | undefined;
  if (!geometries) return;

  const desired = lod === "low" && geometries.low ? geometries.low : geometries.high;
  if (desired && mesh.geometry !== desired) {
    mesh.geometry = desired;
  }
};

export const disposeLodGeometries = (geometries?: LodGeometries) => {
  if (!geometries) return;
  geometries.high.dispose();
  if (geometries.low && geometries.low !== geometries.high) {
    geometries.low.dispose();
  }
};
