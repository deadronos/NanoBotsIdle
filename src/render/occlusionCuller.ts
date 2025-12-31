/**
 * Optional occlusion culling using WebGL2 occlusion queries.
 *
 * Features:
 * - Feature-detected (no-op if WebGL2 not available)
 * - Pooled queries to avoid per-frame allocations
 * - Multi-frame async result handling (queries are not immediate)
 * - Gated by config flag
 */

import type { Camera, Mesh, Object3D, WebGLRenderer } from "three";
import { Box3, Sphere, Vector3 } from "three";

export type OcclusionConfig = {
  enabled: boolean;
  /** Frames to wait before reusing a query slot */
  queryDelayFrames: number;
  /** Maximum queries per frame to avoid stalls */
  maxQueriesPerFrame: number;
};

export const defaultOcclusionConfig: OcclusionConfig = {
  enabled: false,
  queryDelayFrames: 2,
  maxQueriesPerFrame: 16,
};

type QuerySlot = {
  query: WebGLQuery;
  mesh: Mesh | null;
  pendingFrames: number;
};

export type OcclusionCuller = {
  isSupported: boolean;
  update: (meshes: Iterable<Object3D>, camera: Camera) => void;
  dispose: () => void;
};

const _sphere = new Sphere();
const _box = new Box3();
const _center = new Vector3();

/**
 * Create an occlusion culler bound to a WebGL renderer.
 * Returns a no-op culler if WebGL2 is not available or config is disabled.
 */
export const createOcclusionCuller = (
  renderer: WebGLRenderer,
  config: OcclusionConfig = defaultOcclusionConfig,
): OcclusionCuller => {
  const gl = renderer.getContext();
  const isWebGL2 = "WebGL2RenderingContext" in globalThis && gl instanceof WebGL2RenderingContext;

  if (!config.enabled || !isWebGL2) {
    return {
      isSupported: false,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      update: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dispose: () => {},
    };
  }

  const gl2 = gl as WebGL2RenderingContext;

  // Query pool
  const pool: QuerySlot[] = [];
  const meshQueryMap = new WeakMap<Mesh, QuerySlot>();

  const getOrCreateSlot = (mesh: Mesh): QuerySlot | null => {
    // Check existing slot
    const existing = meshQueryMap.get(mesh);
    if (existing) return existing;

    // Find free slot in pool
    for (const slot of pool) {
      if (slot.mesh === null) {
        slot.mesh = mesh;
        slot.pendingFrames = 0;
        meshQueryMap.set(mesh, slot);
        return slot;
      }
    }

    // Create new slot if under limit
    if (pool.length < config.maxQueriesPerFrame * 4) {
      const query = gl2.createQuery();
      if (!query) return null;
      const slot: QuerySlot = { query, mesh, pendingFrames: 0 };
      pool.push(slot);
      meshQueryMap.set(mesh, slot);
      return slot;
    }

    return null;
  };

  const releaseSlot = (slot: QuerySlot) => {
    if (slot.mesh) {
      meshQueryMap.delete(slot.mesh);
      slot.mesh = null;
    }
  };

  const update = (meshes: Iterable<Object3D>, _camera: Camera) => {
    let queriesThisFrame = 0;

    // Process pending queries and issue new ones
    for (const node of meshes) {
      if (!(node as Mesh).isMesh) continue;
      const mesh = node as Mesh;

      const slot = getOrCreateSlot(mesh);
      if (!slot) continue;

      // Check if query result is available
      if (slot.pendingFrames > 0) {
        slot.pendingFrames -= 1;

        if (slot.pendingFrames === 0) {
          const available = gl2.getQueryParameter(slot.query, gl2.QUERY_RESULT_AVAILABLE);
          if (available) {
            const passed = gl2.getQueryParameter(slot.query, gl2.QUERY_RESULT);
            mesh.userData.occluded = passed === 0;
          }
        }
        continue;
      }

      // Skip if already culled by frustum/distance
      if (!mesh.visible) continue;

      // Issue new query (capped per frame)
      if (queriesThisFrame >= config.maxQueriesPerFrame) continue;

      // Use bounding sphere for simple occlusion test region
      const geometry = mesh.geometry;
      if (!geometry) continue;

      if (!geometry.boundingSphere) {
        geometry.computeBoundingSphere();
      }
      const boundingSphere = geometry.boundingSphere;
      if (!boundingSphere) continue;

      // Begin occlusion query
      gl2.beginQuery(gl2.ANY_SAMPLES_PASSED_CONSERVATIVE, slot.query);

      // Simplified: We just mark that we started a query.
      // In a real implementation, we'd render a proxy geometry here.
      // For now, this is a prototype that tracks the query lifecycle.

      gl2.endQuery(gl2.ANY_SAMPLES_PASSED_CONSERVATIVE);

      slot.pendingFrames = config.queryDelayFrames;
      queriesThisFrame += 1;
    }
  };

  const dispose = () => {
    for (const slot of pool) {
      gl2.deleteQuery(slot.query);
      releaseSlot(slot);
    }
    pool.length = 0;
  };

  return {
    isSupported: true,
    update,
    dispose,
  };
};

/**
 * Apply occlusion results to mesh visibility.
 * Should be called after `applyChunkVisibility` to layer on occlusion culling.
 */
export const applyOcclusionVisibility = (meshes: Iterable<Object3D>) => {
  for (const node of meshes) {
    if (!(node as Mesh).isMesh) continue;
    const mesh = node as Mesh;

    // Only hide if both visible from frustum/LOD AND occluded
    if (mesh.visible && mesh.userData.occluded) {
      mesh.visible = false;
      mesh.userData.culledByOcclusion = true;
    }
  }
};
