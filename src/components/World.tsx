import React from "react";

import { useConfig } from "../config/useConfig";
import { getSeed } from "../sim/seed";
import { useUiStore } from "../ui/store";
import { VoxelLayerInstanced } from "./world/VoxelLayerInstanced";
import { VoxelLayerMeshed } from "./world/VoxelLayerMeshed";

export const World: React.FC = () => {
  const cfg = useConfig();
  const prestigeLevel = useUiStore((state) => state.snapshot.prestigeLevel);
  const actualSeed = useUiStore((state) => state.snapshot.actualSeed);
  const seed = actualSeed ?? getSeed(prestigeLevel); // Use actualSeed if available, fall back to computed
  const chunkSize = cfg.terrain.chunkSize ?? 16;
  const spawnX = Math.floor(
    useUiStore((state) => state.snapshot.landingSpawn?.x) ?? cfg.player.spawnX ?? 0,
  );
  const spawnZ = Math.floor(
    useUiStore((state) => state.snapshot.landingSpawn?.z) ?? cfg.player.spawnZ ?? 0,
  );
  const voxelRenderMode = cfg.render.voxels.mode;

  return (
    <group>
      {voxelRenderMode === "meshed" ?
        <VoxelLayerMeshed
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
        />
      : <VoxelLayerInstanced
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
          voxelRenderMode={voxelRenderMode}
        />
      }

      {/* Lift the surface slightly above coplanar voxel tops. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, cfg.terrain.waterLevel + 0.02, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[cfg.terrain.worldRadius * 2 + 20, cfg.terrain.worldRadius * 2 + 20]}
        />
        <meshStandardMaterial
          color="#438caa"
          transparent
          opacity={0.66}
          depthWrite={false}
          roughness={0.24}
          metalness={0.08}
        />
      </mesh>

      {/* Bedrock plane for world bounds */}
      <mesh
        position={[0, cfg.terrain.bedrockY ?? -50, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry
          args={[cfg.terrain.worldRadius * 2 + 10, cfg.terrain.worldRadius * 2 + 10]}
        />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
};
