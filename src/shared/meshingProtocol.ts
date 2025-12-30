import type { ChunkOrigin } from "../meshing/apronField";
import type { MeshGeometry } from "../meshing/meshTypes";

export type ChunkCoord = { cx: number; cy: number; cz: number; size: number };

export type MeshingJob = {
  t: "MESH_CHUNK";
  jobId: number;
  chunk: ChunkCoord;
  origin: ChunkOrigin;
  rev: number;
  materials: Uint8Array;
};

export type MeshResult = {
  t: "MESH_RESULT";
  jobId: number;
  chunk: ChunkCoord;
  rev: number;
  geometry: MeshGeometry;
  lods?: MeshLodGeometry[];
};

export type MeshLodGeometry = {
  level: "low";
  geometry: MeshGeometry;
};

export type MeshError = {
  t: "MESH_ERROR";
  jobId: number;
  chunk: ChunkCoord;
  rev: number;
  message: string;
};

export type ToMeshingWorker = MeshingJob;
export type FromMeshingWorker = MeshResult | MeshError;
