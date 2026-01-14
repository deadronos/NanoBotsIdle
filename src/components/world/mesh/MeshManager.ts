import type { Group, MeshStandardMaterial } from "three";
import { BufferGeometry, Mesh } from "three";

import {
  applyLodGeometry,
  disposeLodGeometries,
  type LodGeometries,
} from "../../../render/lodGeometry";
import type { LodLevel } from "../../../render/lodUtils";
import type { MeshResult } from "../../../shared/meshingProtocol";
import { chunkKey } from "../chunkHelpers";
import { buildBufferGeometry } from "./geometryBuilder";

export class MeshManager {
  private meshes = new Map<string, Mesh>();
  private processedChunkKeys = new Set<string>();
  private emptyChunkKeys = new Set<string>();
  private pendingResults = new Map<string, MeshResult>();
  private group: Group | null = null;

  constructor(private material: MeshStandardMaterial) {}

  setGroup(group: Group | null) {
    this.group = group;
  }

  queueResult(result: MeshResult) {
    const key = chunkKey(result.chunk.cx, result.chunk.cy, result.chunk.cz);
    this.pendingResults.set(key, result);
  }

  processQueue(maxPerFrame: number, waterLevel: number) {
    const group = this.group;
    if (!group || this.pendingResults.size === 0) return;

    const pending = Array.from(this.pendingResults.entries()).slice(0, maxPerFrame);

    pending.forEach(([key, res]) => {
      this.pendingResults.delete(key);
      this.applyMeshResult(res, waterLevel);
    });
  }

  applyMeshResult(result: MeshResult, waterLevel: number) {
    const key = chunkKey(result.chunk.cx, result.chunk.cy, result.chunk.cz);
    this.processedChunkKeys.add(key);

    const group = this.group;
    if (!group) {
      // If results arrive before the group is mounted, cache and apply later.
      this.pendingResults.set(key, result);
      return;
    }

    const { positions, indices } = result.geometry;

    if (indices.length === 0 || positions.length === 0) {
      this.emptyChunkKeys.add(key);
      this.pendingResults.delete(key);

      const existing = this.meshes.get(key);
      if (existing) {
        group.remove(existing);
        disposeLodGeometries(existing.userData.lodGeometries as LodGeometries | undefined);
        this.meshes.delete(key);
      }
      return;
    }

    this.emptyChunkKeys.delete(key);
    this.pendingResults.delete(key);

    let mesh = this.meshes.get(key);
    if (!mesh) {
      mesh = new Mesh(new BufferGeometry(), this.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.meshes.set(key, mesh);
    }

    const previous = mesh.userData.lodGeometries as LodGeometries | undefined;

    const highGeometry = buildBufferGeometry(result.geometry, waterLevel);
    const lowInput = result.lods?.find((lod) => lod.level === "low");
    const lowGeometry = lowInput ? buildBufferGeometry(lowInput.geometry, waterLevel) : undefined;

    const lodGeometries: LodGeometries = { high: highGeometry, low: lowGeometry };
    mesh.userData.lodGeometries = lodGeometries;

    const desiredLod: LodLevel = (mesh.userData.lod as LodLevel | undefined) ?? "high";
    mesh.userData.lod = desiredLod;
    applyLodGeometry(mesh, desiredLod);

    disposeLodGeometries(previous);
  }

  disposeAll() {
    const group = this.group;
    for (const mesh of this.meshes.values()) {
      group?.remove(mesh);
      disposeLodGeometries(mesh.userData.lodGeometries as LodGeometries | undefined);
    }
    this.meshes.clear();
    this.processedChunkKeys.clear();
    this.emptyChunkKeys.clear();
    this.pendingResults.clear();
  }

  getDebugState() {
    return {
      meshChunkKeys: Array.from(this.meshes.keys()),
      processedChunkKeys: Array.from(this.processedChunkKeys.keys()),
      emptyChunkKeys: Array.from(this.emptyChunkKeys.keys()),
      pendingResultCount: this.pendingResults.size,
    };
  }
}
