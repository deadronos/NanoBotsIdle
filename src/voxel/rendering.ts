import * as THREE from "three";

import type { BuiltGeometry } from "./meshing";
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

      updateGeometry(cm.mesh.geometry, c.built);
      c.built = null;

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

function updateGeometry(geometry: THREE.BufferGeometry, built: BuiltGeometry): void {
  const { buffers, vertexCount, indexCount } = built;
  const positions = buffers.positions.subarray(0, vertexCount * 3);
  const normals = buffers.normals.subarray(0, vertexCount * 3);
  const uvs = buffers.uvs.subarray(0, vertexCount * 2);
  const colors = buffers.colors.subarray(0, vertexCount * 3);
  const indices = buffers.indices.subarray(0, indexCount);

  updateAttribute(geometry, "position", positions, 3);
  updateAttribute(geometry, "normal", normals, 3);
  updateAttribute(geometry, "uv", uvs, 2);
  updateAttribute(geometry, "color", colors, 3);
  updateIndex(geometry, indices);

  geometry.setDrawRange(0, indexCount);
  geometry.computeBoundingSphere();
}

function updateAttribute(
  geometry: THREE.BufferGeometry,
  name: string,
  array: Float32Array,
  itemSize: number,
): void {
  const existing = geometry.getAttribute(name);
  if (existing instanceof THREE.BufferAttribute && existing.array.length >= array.length) {
    (existing.array as Float32Array).set(array);
    existing.needsUpdate = true;
    return;
  }
  geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
}

function updateIndex(geometry: THREE.BufferGeometry, array: Uint32Array): void {
  const existing = geometry.getIndex();
  if (
    existing instanceof THREE.BufferAttribute &&
    existing.array instanceof Uint32Array &&
    existing.array.length >= array.length
  ) {
    (existing.array as Uint32Array).set(array);
    existing.needsUpdate = true;
    return;
  }
  geometry.setIndex(new THREE.BufferAttribute(array, 1));
}
