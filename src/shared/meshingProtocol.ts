import type { ChunkOrigin } from "../meshing/apronField";

export type ChunkCoord = { cx: number; cy: number; cz: number; size: number };

export type MeshingJob = {
  t: "MESH_CHUNK";
  jobId: number;
  chunk: ChunkCoord;
  origin: ChunkOrigin;
  rev: number;
  materials: Uint8Array;
  queuedAt?: number; // Timestamp when job was queued
};

export type MeshResult = {
  t: "MESH_RESULT";
  jobId: number;
  chunk: ChunkCoord;
  rev: number;
  geometry: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array | Uint32Array;
  };
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
