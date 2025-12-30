import type { ChunkOrigin } from "./apronField";

export type MeshGeometry = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array | Uint32Array;
};

export type GreedyMeshInput = {
  size: number;
  origin: ChunkOrigin;
  // (size+2)^3 samples (1-voxel apron)
  materials: Uint8Array;
};

