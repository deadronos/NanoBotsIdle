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
  waterLevel?: number;
  queuedAt?: number; // Timestamp when job was queued
};

export type MeshResult = {
  t: "MESH_RESULT";
  jobId: number;
  chunk: ChunkCoord;
  rev: number;
  geometry: MeshGeometry;
  meshingTimeMs?: number; // Overall time spent meshing for this result (worker attaches this)
  lods?: MeshLodGeometry[];
};

export type MeshLodGeometry = {
  level: "low";
  geometry: MeshGeometry;
  meshingTimeMs?: number; // Time spent meshing
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
