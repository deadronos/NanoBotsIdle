import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { InstancedBufferAttribute, Object3D } from "three";

import { getConfig } from "../config/index";
import { ensureGeometryHasVertexColors } from "../render/instanced";
import { applyVoxelEdits, getVoxelMaterialAt, MATERIAL_SOLID, resetVoxelEdits } from "../sim/collision";
import { getSeed, getSurfaceHeight } from "../sim/terrain";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { getVoxelColor } from "../utils";

const keyFromCoords = (x: number, y: number, z: number) => `${x},${y},${z}`;
const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;
const mod = (value: number, size: number) => ((value % size) + size) % size;

const getInitialCapacity = (chunkSize: number) => {
  return Math.max(512, chunkSize * chunkSize * chunkSize);
};

export const World: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const solidPositions = useRef<number[]>([]);
  const solidIndex = useRef<Map<string, number>>(new Map());
  const solidCount = useRef(0);
  const activeChunks = useRef<Set<string>>(new Set());
  const needsRebuild = useRef(false);
  const tmp = useMemo(() => new Object3D(), []);

  const cfg = getConfig();
  const bridge = getSimBridge();
  const prestigeLevel = useUiStore((state) => state.snapshot.prestigeLevel);
  const seed = getSeed(prestigeLevel);
  const chunkSize = cfg.terrain.chunkSize ?? 16;
  const spawnX = cfg.player.spawnX ?? 0;
  const spawnZ = cfg.player.spawnZ ?? 0;

  const [capacity, setCapacity] = useState(() => getInitialCapacity(chunkSize));

  const ensureCapacity = useCallback(
    (count: number) => {
      if (count <= capacity) return;
      const nextCapacity = Math.max(count, Math.ceil(capacity * 1.5));
      needsRebuild.current = true;
      setCapacity(nextCapacity);
    },
    [capacity],
  );

  const setVoxelInstance = useCallback(
    (mesh: InstancedMesh, index: number, x: number, y: number, z: number) => {
      tmp.position.set(x, y, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(index, tmp.matrix);
      mesh.setColorAt(index, getVoxelColor(y));
    },
    [tmp],
  );

  const rebuildMesh = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const positions = solidPositions.current;
    const count = positions.length / 3;
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      setVoxelInstance(mesh, i, positions[base], positions[base + 1], positions[base + 2]);
    }
    mesh.count = count;
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [setVoxelInstance]);

  const addVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const key = keyFromCoords(x, y, z);
      if (solidIndex.current.has(key)) return;
      const index = solidCount.current;
      solidIndex.current.set(key, index);
      solidPositions.current.push(x, y, z);
      solidCount.current += 1;
      ensureCapacity(solidCount.current);

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        setVoxelInstance(mesh, index, x, y, z);
        mesh.count = solidCount.current;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [ensureCapacity, setVoxelInstance],
  );

  const removeVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const key = keyFromCoords(x, y, z);
      const index = solidIndex.current.get(key);
      if (index === undefined) return;
      const lastIndex = solidCount.current - 1;
      const positions = solidPositions.current;
      if (index !== lastIndex) {
        const lastBase = lastIndex * 3;
        const lastX = positions[lastBase];
        const lastY = positions[lastBase + 1];
        const lastZ = positions[lastBase + 2];
        positions[index * 3] = lastX;
        positions[index * 3 + 1] = lastY;
        positions[index * 3 + 2] = lastZ;
        const lastKey = keyFromCoords(lastX, lastY, lastZ);
        solidIndex.current.set(lastKey, index);
        if (meshRef.current && !needsRebuild.current) {
          setVoxelInstance(meshRef.current, index, lastX, lastY, lastZ);
        }
      }
      positions.length -= 3;
      solidCount.current -= 1;
      solidIndex.current.delete(key);
      if (meshRef.current && !needsRebuild.current) {
        meshRef.current.count = solidCount.current;
        if (meshRef.current.instanceMatrix) meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
      }
    },
    [setVoxelInstance],
  );

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);

      const size = chunkSize;
      const baseX = cx * size;
      const baseY = cy * size;
      const baseZ = cz * size;

      ensureCapacity(solidCount.current + size * size * size);

      for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
          for (let z = 0; z < size; z += 1) {
            const wx = baseX + x;
            const wy = baseY + y;
            const wz = baseZ + z;
            if (getVoxelMaterialAt(wx, wy, wz, prestigeLevel) === MATERIAL_SOLID) {
              addVoxel(wx, wy, wz);
            }
          }
        }
      }
      needsRebuild.current = true;
    },
    [addVoxel, chunkSize, ensureCapacity, prestigeLevel],
  );

  const ensureInitialChunk = useCallback(() => {
    if (activeChunks.current.size > 0) return;
    const surfaceY = getSurfaceHeight(spawnX, spawnZ, seed);
    const cy = Math.floor(surfaceY / chunkSize);
    const baseCx = Math.floor(spawnX / chunkSize);
    const baseCz = Math.floor(spawnZ / chunkSize);
    for (let cx = -1; cx <= 1; cx += 1) {
      for (let cz = -1; cz <= 1; cz += 1) {
        addChunk(baseCx + cx, cy, baseCz + cz);
      }
    }
  }, [addChunk, chunkSize, seed, spawnX, spawnZ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
        frame.delta.edits.forEach((edit) => {
          if (edit.mat === MATERIAL_SOLID) {
            addVoxel(edit.x, edit.y, edit.z);
          } else {
            removeVoxel(edit.x, edit.y, edit.z);
          }
        });
      }

      if (frame.delta.frontierReset) {
        solidPositions.current = [];
        solidIndex.current.clear();
        solidCount.current = 0;
        activeChunks.current.clear();
        resetVoxelEdits();
        needsRebuild.current = false;
        if (meshRef.current) {
          meshRef.current.count = 0;
          if (meshRef.current.instanceMatrix) meshRef.current.instanceMatrix.needsUpdate = true;
          if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
      }

      ensureInitialChunk();

      const mined = frame.delta.minedPositions;
      if (mined && mined.length > 0) {
        for (let i = 0; i < mined.length; i += 3) {
          const x = mined[i];
          const y = mined[i + 1];
          const z = mined[i + 2];
          const cx = Math.floor(x / chunkSize);
          const cy = Math.floor(y / chunkSize);
          const cz = Math.floor(z / chunkSize);
          const lx = mod(x, chunkSize);
          const ly = mod(y, chunkSize);
          const lz = mod(z, chunkSize);
          if (lx === 0) addChunk(cx - 1, cy, cz);
          if (lx === chunkSize - 1) addChunk(cx + 1, cy, cz);
          if (ly === 0) addChunk(cx, cy - 1, cz);
          if (ly === chunkSize - 1) addChunk(cx, cy + 1, cz);
          if (lz === 0) addChunk(cx, cy, cz - 1);
          if (lz === chunkSize - 1) addChunk(cx, cy, cz + 1);
        }
      }

      if (needsRebuild.current && meshRef.current && solidCount.current <= capacity) {
        rebuildMesh();
        needsRebuild.current = false;
      }
    });
  }, [
    addChunk,
    addVoxel,
    bridge,
    capacity,
    chunkSize,
    ensureInitialChunk,
    rebuildMesh,
    removeVoxel,
  ]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    ensureGeometryHasVertexColors(meshRef.current.geometry);
    if (!meshRef.current.instanceColor || meshRef.current.instanceColor.count !== capacity) {
      const colors = new Float32Array(capacity * 3);
      colors.fill(1);
      meshRef.current.instanceColor = new InstancedBufferAttribute(colors, 3);
      meshRef.current.geometry.setAttribute("instanceColor", meshRef.current.instanceColor);
      meshRef.current.instanceColor.needsUpdate = true;
      needsRebuild.current = true;
    }
    if (needsRebuild.current) {
      rebuildMesh();
      needsRebuild.current = false;
    }
  }, [capacity, rebuildMesh]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />
      </instancedMesh>

      {/* Water Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cfg.terrain.waterLevel, 0]} receiveShadow>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 20, cfg.terrain.worldRadius * 2 + 20]} />
        <meshStandardMaterial color="#42a7ff" transparent opacity={0.7} roughness={0.0} metalness={0.3} />
      </mesh>

      {/* Bedrock plane for world bounds */}
      <mesh position={[0, cfg.terrain.bedrockY ?? -50, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 10, cfg.terrain.worldRadius * 2 + 10]} />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
};
