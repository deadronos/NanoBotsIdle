import * as THREE from "three";

import type { ChunkKey, World } from "./World";

export type ChunkMesh = {
  key: ChunkKey;
  mesh: THREE.Mesh;
};

export function createChunkMeshes(scene: THREE.Scene, world: World, material: THREE.Material) {
  const meshes = new Map<ChunkKey, ChunkMesh>();
  const pending = new Set<ChunkKey>();

  function ensureMeshForChunkKey(k: ChunkKey): ChunkMesh {
    const existing = meshes.get(k);
    if (existing) return existing;

    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    const cm: ChunkMesh = { key: k, mesh };
    meshes.set(k, cm);
    scene.add(mesh);
    return cm;
  }

  function pruneRemovedChunks() {
    for (const [k, cm] of meshes) {
      if (world.getChunkByKey(k)) continue;
      scene.remove(cm.mesh);
      cm.mesh.geometry.dispose();
      meshes.delete(k);
      pending.delete(k);
    }
  }

  function sync() {
    pruneRemovedChunks();

    // Create/update meshes for chunks that have built geometry.
    for (const k of world.getChunkKeys()) {
      const c = world.getChunkByKey(k);
      if (!c || !c.built) continue;
      if (pending.has(k)) continue;
      // Rebuild only when chunk is not dirty and has a built result.
      pending.add(k);
    }

    // Limit mesh swaps per frame.
    let done = 0;
    const maxPerFrame = 6;

    for (const k of pending) {
      const c = world.getChunkByKey(k);
      if (!c || !c.built) {
        pending.delete(k);
        continue;
      }

      const cm = ensureMeshForChunkKey(k);

      cm.mesh.geometry.dispose();
      cm.mesh.geometry = c.built.geometry;

      pending.delete(k);

      done++;
      if (done >= maxPerFrame) break;
    }
  }

  function dispose() {
    for (const [, cm] of meshes) {
      scene.remove(cm.mesh);
      cm.mesh.geometry.dispose();
    }
    meshes.clear();
    pending.clear();
  }

  return { sync, dispose };
}
