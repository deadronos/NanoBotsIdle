import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial } from "three";

import { createApronField, fillApronField } from "../../meshing/apronField";
import { getDirtyChunksForVoxelEdit } from "../../meshing/dirtyChunks";
import { MeshingScheduler } from "../../meshing/meshingScheduler";
import { defaultMeshingWorkerFactory } from "../../meshing/meshingWorkerFactory";
import type { MeshResult } from "../../shared/meshingProtocol";
import type { VoxelEdit } from "../../shared/protocol";
import { getVoxelMaterialAt } from "../../sim/collision";
import { chunkDistanceSq3 } from "../../utils";

const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;

export const useMeshedChunks = (options: { chunkSize: number; prestigeLevel: number; waterLevel: number }) => {
  const { chunkSize, prestigeLevel, waterLevel } = options;

  const focusChunkRef = useRef<{ cx: number; cy: number; cz: number }>({ cx: 0, cy: 0, cz: 0 });

  // Color mapping kept local to avoid importing `three` types in worker code.
  // Reuse Color instances to avoid per-vertex allocations.
  const deepWater = useMemo(() => new Color("#1a4d8c"), []);
  const water = useMemo(() => new Color("#2d73bf"), []);
  const sand = useMemo(() => new Color("#e3dba3"), []);
  const grass = useMemo(() => new Color("#59a848"), []);
  const darkGrass = useMemo(() => new Color("#3b7032"), []);
  const rock = useMemo(() => new Color("#6e6e6e"), []);
  const snow = useMemo(() => new Color("#f2f4f8"), []);

  const writeVertexColor = useCallback(
    (out: Float32Array, base: number, y: number) => {
      // Mirrors the intent of `getVoxelColor()` without allocations.
      let c: Color;
      if (y < waterLevel - 2) c = deepWater;
      else if (y < waterLevel + 0.5) c = water;
      else if (y < waterLevel + 2.5) c = sand;
      else if (y < waterLevel + 6) c = grass;
      else if (y < waterLevel + 12) c = darkGrass;
      else if (y < waterLevel + 20) c = rock;
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
      mesh.geometry.dispose();
    }
    meshes.clear();
    processedChunkKeysRef.current.clear();
    emptyChunkKeysRef.current.clear();
    pendingResultsRef.current.clear();
  }, []);

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

      const { positions, normals, indices } = result.geometry;

      if (indices.length === 0 || positions.length === 0) {
        emptyChunkKeysRef.current.add(key);
        pendingResultsRef.current.delete(key);
        const existing = meshesRef.current.get(key);
        if (existing) {
          group.remove(existing);
          existing.geometry.dispose();
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

      const geometry = mesh.geometry as BufferGeometry;
      geometry.setAttribute("position", new BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new BufferAttribute(normals, 3));

      const colors = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; i += 3) {
        // positions are already in world coordinates
        writeVertexColor(colors, i, positions[i + 1]);
      }
      geometry.setAttribute("color", new BufferAttribute(colors, 3));

      geometry.setIndex(new BufferAttribute(indices, 1));
      geometry.computeBoundingSphere();
    },
    [material, writeVertexColor],
  );

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const group = groupRef.current;
      if (group && pendingResultsRef.current.size > 0) {
        const pending = Array.from(pendingResultsRef.current.values());
        pendingResultsRef.current.clear();
        pending.forEach((res) => applyMeshResult(res));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyMeshResult]);

  useEffect(() => {
    const worker = defaultMeshingWorkerFactory();

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
          materialAt: (x, y, z) => getVoxelMaterialAt(x, y, z, prestigeLevel),
        });

        return {
          msg: {
            t: "MESH_CHUNK",
            jobId,
            rev,
            chunk: { ...coord, size: chunkSize },
            origin,
            materials,
          },
          transfer: [materials.buffer],
        };
      },
      onApply: (res) => applyMeshResult(res),
      maxInFlight: 8,
      getPriority: priorityFromFocus,
    });

    schedulerRef.current = scheduler;
    return () => {
      schedulerRef.current = null;
      scheduler.dispose();
      disposeAllMeshes();
    };
  }, [applyMeshResult, chunkSize, disposeAllMeshes, prestigeLevel]);

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
    scheduler.reprioritizeDirty();
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
