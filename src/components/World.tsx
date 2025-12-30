import React, { useCallback, useEffect, useRef } from "react";

import { useConfig } from "../config/useConfig";
import type { VoxelRenderMode } from "../config/render";
import { playerChunk, playerPosition } from "../engine/playerState";
import { applyVoxelEdits, MATERIAL_SOLID, resetVoxelEdits } from "../sim/collision";
import { getSeed } from "../sim/seed";
import { getSurfaceHeightCore } from "../sim/terrain-core";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { chunkKey, ensureNeighborChunksForMinedVoxel, populateChunkVoxels } from "./world/chunkHelpers";
import { forEachRadialChunk } from "../utils";
import { useInstancedVoxels } from "./world/useInstancedVoxels";
import { useMeshedChunks } from "./world/useMeshedChunks";

const VoxelLayerInstanced: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
  voxelRenderMode: Exclude<VoxelRenderMode, "meshed">;
}> = ({ chunkSize, prestigeLevel, seed, spawnX, spawnZ, voxelRenderMode }) => {
  const activeChunks = useRef<Set<string>>(new Set());
  const cfg = useConfig();
  const bridge = getSimBridge();

  const { addVoxel, capacity, clear, ensureCapacity, flushRebuild, meshRef, removeVoxel, solidCountRef } =
    useInstancedVoxels(chunkSize, cfg.terrain.waterLevel);

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);

      ensureCapacity(solidCountRef.current + chunkSize * chunkSize * chunkSize);
      populateChunkVoxels({ cx, cy, cz, chunkSize, prestigeLevel, addVoxel });
    },
    [addVoxel, chunkSize, ensureCapacity, prestigeLevel, solidCountRef],
  );

  const ensureInitialChunk = useCallback(() => {
    if (activeChunks.current.size > 0) return;
    const surfaceY = getSurfaceHeightCore(
      spawnX,
      spawnZ,
      seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale,
    );
    const cy = Math.floor(surfaceY / chunkSize);
    const baseCx = Math.floor(spawnX / chunkSize);
    const baseCz = Math.floor(spawnZ / chunkSize);
    setFocusChunk(baseCx, cy, baseCz);
    for (let cx = -1; cx <= 1; cx += 1) {
      for (let cz = -1; cz <= 1; cz += 1) {
        addChunk(baseCx + cx, cy, baseCz + cz);
      }
    }
  }, [addChunk, chunkSize, cfg.terrain.quantizeScale, cfg.terrain.surfaceBias, seed, setFocusChunk, spawnX, spawnZ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        activeChunks.current.clear();
        clear();
        resetVoxelEdits();
      }

      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
      }

      if (voxelRenderMode === "frontier") {
        if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
          ensureCapacity(solidCountRef.current + frame.delta.frontierAdd.length / 3);
          const positions = frame.delta.frontierAdd;
          for (let i = 0; i < positions.length; i += 3) {
            addVoxel(positions[i], positions[i + 1], positions[i + 2]);
          }
        }

        if (frame.delta.frontierRemove && frame.delta.frontierRemove.length > 0) {
          const positions = frame.delta.frontierRemove;
          for (let i = 0; i < positions.length; i += 3) {
            removeVoxel(positions[i], positions[i + 1], positions[i + 2]);
          }
        }

        flushRebuild();
        return;
      }

      // Debug fallback: dense chunk volume scan.
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        frame.delta.edits.forEach((edit) => {
          if (edit.mat === MATERIAL_SOLID) {
            addVoxel(edit.x, edit.y, edit.z);
          } else {
            removeVoxel(edit.x, edit.y, edit.z);
          }
        });
      }

      ensureInitialChunk();

      // Poll player chunk
      const px = playerPosition.x;
      const py = playerPosition.y;
      const pz = playerPosition.z;
      const pcx = Math.floor(px / chunkSize);
      const pcy = Math.floor(py / chunkSize);
      const pcz = Math.floor(pz / chunkSize);

      if (pcx !== playerChunk.cx || pcy !== playerChunk.cy || pcz !== playerChunk.cz) {
        playerChunk.cx = pcx;
        playerChunk.cy = pcy;
        playerChunk.cz = pcz;
        // Prioritize nearby chunks in radial order to fill nearest areas first
        forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, 1, 3, (c) => {
          addChunk(c.cx, c.cy, c.cz);
        });

        if (voxelRenderMode === "frontier") {
          bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
        }
      }

      const mined = frame.delta.minedPositions;
      if (mined && mined.length > 0) {
        for (let i = 0; i < mined.length; i += 3) {
          ensureNeighborChunksForMinedVoxel({
            x: mined[i],
            y: mined[i + 1],
            z: mined[i + 2],
            chunkSize,
            addChunk,
          });
        }
      }

      flushRebuild();
    });
  }, [
    addChunk,
    addVoxel,
    bridge,
    chunkSize,
    clear,
    ensureCapacity,
    ensureInitialChunk,
    flushRebuild,
    removeVoxel,
    solidCountRef,
    voxelRenderMode,
  ]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />
    </instancedMesh>
  );
};

const VoxelLayerMeshed: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
}> = ({ chunkSize, prestigeLevel, seed, spawnX, spawnZ }) => {
  const activeChunks = useRef<Set<string>>(new Set());
  const cfg = useConfig();
  const bridge = getSimBridge();

  const { ensureChunk, groupRef, markDirtyForEdits, reset, setFocusChunk } = useMeshedChunks({
    chunkSize,
    prestigeLevel,
    waterLevel: cfg.terrain.waterLevel,
  });

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);
      ensureChunk(cx, cy, cz);
    },
    [ensureChunk],
  );

  const ensureInitialChunk = useCallback(() => {
    if (activeChunks.current.size > 0) return;
    const surfaceY = getSurfaceHeightCore(
      spawnX,
      spawnZ,
      seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale,
    );
    const cy = Math.floor(surfaceY / chunkSize);
    const baseCx = Math.floor(spawnX / chunkSize);
    const baseCz = Math.floor(spawnZ / chunkSize);
    for (let cx = -1; cx <= 1; cx += 1) {
      for (let cz = -1; cz <= 1; cz += 1) {
        addChunk(baseCx + cx, cy, baseCz + cz);
      }
    }
  }, [addChunk, chunkSize, cfg.terrain.quantizeScale, cfg.terrain.surfaceBias, seed, spawnX, spawnZ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        activeChunks.current.clear();
        reset();
        resetVoxelEdits();
      }

      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
        markDirtyForEdits(frame.delta.edits);
      }

      ensureInitialChunk();

      // Poll player chunk
      const px = playerPosition.x;
      const py = playerPosition.y;
      const pz = playerPosition.z;
      const pcx = Math.floor(px / chunkSize);
      const pcy = Math.floor(py / chunkSize);
      const pcz = Math.floor(pz / chunkSize);

      if (pcx !== playerChunk.cx || pcy !== playerChunk.cy || pcz !== playerChunk.cz) {
        playerChunk.cx = pcx;
        playerChunk.cy = pcy;
        playerChunk.cz = pcz;
        setFocusChunk(pcx, pcy, pcz);
        // Prioritize nearby chunks in radial order to fill nearest areas first
        forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, 1, 3, (c) => {
          addChunk(c.cx, c.cy, c.cz);
        });
      }
    });
  }, [bridge, chunkSize, ensureInitialChunk, markDirtyForEdits, reset, setFocusChunk]);

  return <group ref={groupRef} />;
};

export const World: React.FC = () => {
  const cfg = useConfig();
  const prestigeLevel = useUiStore((state) => state.snapshot.prestigeLevel);
  const seed = getSeed(prestigeLevel);
  const chunkSize = cfg.terrain.chunkSize ?? 16;
  const spawnX = cfg.player.spawnX ?? 0;
  const spawnZ = cfg.player.spawnZ ?? 0;
  const voxelRenderMode = cfg.render.voxels.mode;

  return (
    <group>
      {voxelRenderMode === "meshed" ? (
        <VoxelLayerMeshed
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
        />
      ) : (
        <VoxelLayerInstanced
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
          voxelRenderMode={voxelRenderMode}
        />
      )}

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
