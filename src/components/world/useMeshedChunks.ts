import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  Vector3,
} from "three";

import { getConfig } from "../../config";
import { createApronField, fillApronField } from "../../meshing/apronField";
import { getDirtyChunksForVoxelEdit } from "../../meshing/dirtyChunks";
import { MeshingScheduler } from "../../meshing/meshingScheduler";
import { defaultMeshingWorkerFactory } from "../../meshing/meshingWorkerFactory";
import {
  applyLodGeometry,
  disposeLodGeometries,
  type LodGeometries,
} from "../../render/lodGeometry";
import type { LodLevel } from "../../render/lodUtils";
import type { MeshResult } from "../../shared/meshingProtocol";
import type { VoxelEdit } from "../../shared/protocol";
import { getVoxelMaterialAt } from "../../sim/collision";
import { TERRAIN_COLORS, TERRAIN_THRESHOLDS } from "../../sim/terrain-constants";
import { chunkDistanceSq3 } from "../../utils";
import { chunkKey } from "./chunkHelpers";

export const useMeshedChunks = (options: {
  chunkSize: number;
  prestigeLevel: number;
  waterLevel: number;
  seed?: number;
  onSchedulerChange?: () => void;
  isChunkVisible?: (coord: { cx: number; cy: number; cz: number }) => boolean;
}) => {
  const { chunkSize, prestigeLevel, waterLevel, seed, onSchedulerChange, isChunkVisible } =
    options;

  const focusChunkRef = useRef<{ cx: number; cy: number; cz: number }>({ cx: 0, cy: 0, cz: 0 });
  const reprioritizeTimeoutRef = useRef<number | null>(null);

  // Color mapping kept local to avoid importing `three` types in worker code.
  // Reuse Color instances to avoid per-vertex allocations.
  const deepWater = useMemo(() => new Color(TERRAIN_COLORS.DEEP_WATER), []);
  const water = useMemo(() => new Color(TERRAIN_COLORS.WATER), []);
  const sand = useMemo(() => new Color(TERRAIN_COLORS.SAND), []);
  const grass = useMemo(() => new Color(TERRAIN_COLORS.GRASS), []);
  const darkGrass = useMemo(() => new Color(TERRAIN_COLORS.DARK_GRASS), []);
  const rock = useMemo(() => new Color(TERRAIN_COLORS.ROCK), []);
  const snow = useMemo(() => new Color(TERRAIN_COLORS.SNOW), []);

  const writeVertexColor = useCallback(
    (out: Float32Array, base: number, y: number) => {
      // Mirrors the intent of `getVoxelColor()` without allocations.
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
    },
    [darkGrass, deepWater, grass, rock, sand, snow, water, waterLevel],
  );

  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Map<string, Mesh>>(new Map());
  const processedChunkKeysRef = useRef<Set<string>>(new Set());
  const emptyChunkKeysRef = useRef<Set<string>>(new Set());
  const pendingResultsRef = useRef<Map<string, MeshResult>>(new Map());
  const schedulerRef = useRef<MeshingScheduler | null>(null);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        roughness: 0.85,
        metalness: 0.05,
        vertexColors: true,
      }),
    [],
  );

  const disposeAllMeshes = useCallback(() => {
    const group = groupRef.current;
    const meshes = meshesRef.current;
    for (const mesh of meshes.values()) {
      group?.remove(mesh);
      disposeLodGeometries(mesh.userData.lodGeometries as LodGeometries | undefined);
    }
    meshes.clear();
    processedChunkKeysRef.current.clear();
    emptyChunkKeysRef.current.clear();
    pendingResultsRef.current.clear();
  }, []);

  const buildBufferGeometry = useCallback(
    (geometry: MeshResult["geometry"]): BufferGeometry => {
      const buffer = new BufferGeometry();
      buffer.setAttribute("position", new BufferAttribute(geometry.positions, 3));
      buffer.setAttribute("normal", new BufferAttribute(geometry.normals, 3));

      if (geometry.colors && geometry.colors.length === geometry.positions.length) {
        buffer.setAttribute("color", new BufferAttribute(geometry.colors, 3));
      } else {
        const colors = new Float32Array(geometry.positions.length);
        for (let i = 0; i < geometry.positions.length; i += 3) {
          // positions are already in world coordinates
          writeVertexColor(colors, i, geometry.positions[i + 1]);
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
    },
    [writeVertexColor],
  );

  const applyMeshResult = useCallback(
    (result: MeshResult) => {
      const key = chunkKey(result.chunk.cx, result.chunk.cy, result.chunk.cz);
      processedChunkKeysRef.current.add(key);

      const group = groupRef.current;
      if (!group) {
        // If results arrive before the group is mounted, cache and apply later.
        pendingResultsRef.current.set(key, result);
        return;
      }

      const { positions, indices } = result.geometry;

      if (indices.length === 0 || positions.length === 0) {
        emptyChunkKeysRef.current.add(key);
        pendingResultsRef.current.delete(key);
        const existing = meshesRef.current.get(key);
        if (existing) {
          group.remove(existing);
          disposeLodGeometries(existing.userData.lodGeometries as LodGeometries | undefined);
          meshesRef.current.delete(key);
        }
        return;
      }

      emptyChunkKeysRef.current.delete(key);
      pendingResultsRef.current.delete(key);

      let mesh = meshesRef.current.get(key);
      if (!mesh) {
        mesh = new Mesh(new BufferGeometry(), material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        meshesRef.current.set(key, mesh);
      }

      const previous = mesh.userData.lodGeometries as LodGeometries | undefined;

      const highGeometry = buildBufferGeometry(result.geometry);
      const lowInput = result.lods?.find((lod) => lod.level === "low");
      const lowGeometry = lowInput ? buildBufferGeometry(lowInput.geometry) : undefined;

      const lodGeometries: LodGeometries = { high: highGeometry, low: lowGeometry };
      mesh.userData.lodGeometries = lodGeometries;

      const desiredLod: LodLevel = (mesh.userData.lod as LodLevel | undefined) ?? "high";
      mesh.userData.lod = desiredLod;
      applyLodGeometry(mesh, desiredLod);

      disposeLodGeometries(previous);
    },
    [buildBufferGeometry, material],
  );

  useEffect(() => {
    let raf = 0;
    const config = getConfig();
    const tick = () => {
      const group = groupRef.current;
      if (group && pendingResultsRef.current.size > 0) {
        // Apply a limited number of mesh results per frame to bound main-thread work
        const maxPerFrame = config.meshing.maxMeshesPerFrame;
        const pending = Array.from(pendingResultsRef.current.entries()).slice(0, maxPerFrame);

        pending.forEach(([key, res]) => {
          pendingResultsRef.current.delete(key);
          applyMeshResult(res);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyMeshResult]);

  useEffect(() => {
    const worker = defaultMeshingWorkerFactory();
    const config = getConfig();

    const priorityFromFocus = (coord: { cx: number; cy: number; cz: number }) => {
      return chunkDistanceSq3(coord, focusChunkRef.current);
    };

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize,
      buildJob: (coord, rev, jobId) => {
        const origin = {
          x: coord.cx * chunkSize,
          y: coord.cy * chunkSize,
          z: coord.cz * chunkSize,
        };

        const materials = createApronField(chunkSize);
        fillApronField(materials, {
          size: chunkSize,
          origin,
          materialAt: (x, y, z) => getVoxelMaterialAt(x, y, z, prestigeLevel, seed),
        });

        return {
          msg: {
            t: "MESH_CHUNK",
            jobId,
            rev,
            chunk: { ...coord, size: chunkSize },
            origin,
            materials,
            waterLevel,
          },
          transfer: [materials.buffer],
        };
      },
      // Keep message handler lightweight: just enqueue results so the message
    // event isn't blocked by expensive main-thread mesh construction.
    onApply: (res) => {
      const key = chunkKey(res.chunk.cx, res.chunk.cy, res.chunk.cz);
      pendingResultsRef.current.set(key, res);
    },
      maxInFlight: config.meshing.maxInFlight,
      maxQueueSize: config.meshing.maxQueueSize,
      getPriority: priorityFromFocus,
      isVisible: isChunkVisible,
    });

    schedulerRef.current = scheduler;
    // Notify parent that scheduler was (re)created so it can re-sync its chunk tracking
    onSchedulerChange?.();
    return () => {
      // Clear any pending reprioritization timeout
      if (reprioritizeTimeoutRef.current !== null) {
        clearTimeout(reprioritizeTimeoutRef.current);
        reprioritizeTimeoutRef.current = null;
      }
      schedulerRef.current = null;
      scheduler.dispose();
      disposeAllMeshes();
    };
  }, [
    applyMeshResult,
    chunkSize,
    disposeAllMeshes,
    isChunkVisible,
    onSchedulerChange,
    prestigeLevel,
    seed,
    waterLevel,
  ]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const ensureChunk = useCallback((cx: number, cy: number, cz: number) => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    scheduler.markDirty({ cx, cy, cz });
    scheduler.pump();
  }, []);

  const markDirtyForEdits = useCallback(
    (edits: VoxelEdit[]) => {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;
      for (const edit of edits) {
        const dirty = getDirtyChunksForVoxelEdit({
          x: edit.x,
          y: edit.y,
          z: edit.z,
          chunkSize,
        });
        scheduler.markDirtyMany(dirty);
      }
      scheduler.pump();
    },
    [chunkSize],
  );

  const reset = useCallback(() => {
    schedulerRef.current?.clearAll();
    disposeAllMeshes();
  }, [disposeAllMeshes]);

  const setFocusChunk = useCallback((cx: number, cy: number, cz: number) => {
    focusChunkRef.current = { cx, cy, cz };
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    // Debounce reprioritization to avoid expensive heap rebuilds on every frame when player moves.
    // Update focus immediately but defer the actual reprioritization for 150ms.
    if (reprioritizeTimeoutRef.current !== null) {
      clearTimeout(reprioritizeTimeoutRef.current);
    }

    reprioritizeTimeoutRef.current = window.setTimeout(() => {
      reprioritizeTimeoutRef.current = null;
      const currentScheduler = schedulerRef.current;
      if (currentScheduler) {
        currentScheduler.reprioritizeDirty();
        currentScheduler.pump();
      }
    }, 150);

    // Always pump immediately to process any pending chunks, even without reprioritization
    scheduler.pump();
  }, []);

  const getDebugState = useCallback(() => {
    const scheduler = schedulerRef.current;
    return {
      meshChunkKeys: Array.from(meshesRef.current.keys()),
      processedChunkKeys: Array.from(processedChunkKeysRef.current.keys()),
      emptyChunkKeys: Array.from(emptyChunkKeysRef.current.keys()),
      pendingResultCount: pendingResultsRef.current.size,
      dirtyKeys: scheduler?.getDirtyKeys() ?? [],
      inFlight: scheduler?.getInFlightCount() ?? 0,
    };
  }, []);

  return {
    groupRef,
    ensureChunk,
    markDirtyForEdits,
    setFocusChunk,
    getDebugState,
    reset,
  };
};
