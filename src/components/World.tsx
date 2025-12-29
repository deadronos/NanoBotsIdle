import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { InstancedMesh } from "three";
import { Vector3 } from "three";

import { WATER_LEVEL,WORLD_RADIUS } from "../constants";
import { populateInstancedMesh, setInstanceTransform } from "../render/instanced";
import { generateInstances, getSeed } from "../sim/terrain";
import { useGameStore } from "../store";

export interface WorldApi {
  getRandomTarget: () => { index: number; position: Vector3; value: number } | null;
  mineBlock: (index: number) => number; // Returns value mined
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WorldProps {}

// WORLD_RADIUS moved to `src/constants.ts`

export const World = forwardRef<WorldApi, WorldProps>((props, ref) => {
  const meshRef = useRef<InstancedMesh>(null);

  const setTotalBlocks = useGameStore((state) => state.setTotalBlocks);
  const incrementMinedBlocks = useGameStore((state) => state.incrementMinedBlocks);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const seed = getSeed(prestigeLevel); // Change seed on prestige

  // Generate the terrain data (centralized in sim/terrain)
  const instances = useMemo(() => {
    return generateInstances(seed, WORLD_RADIUS);
  }, [seed]);

  // Track mined blocks via a Ref to avoid re-renders
  const minedIndices = useRef<Set<number>>(new Set());
  const instanceCount = instances.length;

  useEffect(() => {
    setTotalBlocks(instanceCount);
    minedIndices.current.clear();
  }, [instanceCount, setTotalBlocks]);

  // Expose API for Drones
  useImperativeHandle(ref, () => ({
    getRandomTarget: () => {
      // Attempt to find a non-mined block
      let attempts = 0;
      while (attempts < 20) {
        const idx = Math.floor(Math.random() * instanceCount);
        if (!minedIndices.current.has(idx)) {
          const data = instances[idx];
          return {
            index: idx,
            position: new Vector3(data.x, data.y, data.z),
            value: data.value,
          };
        }
        attempts++;
      }
      return null;
    },
    mineBlock: (index: number) => {
      if (minedIndices.current.has(index)) return 0;

      minedIndices.current.add(index);
      incrementMinedBlocks();

      // Update visual: Scale to 0 using shared helper
      const mesh = meshRef.current;
      if (mesh) {
        setInstanceTransform(mesh, index, { scale: { x: 0, y: 0, z: 0 } });
      }

      return instances[index].value;
    },
  }));

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Use centralized helper to populate the instanced mesh
    populateInstancedMesh(meshRef.current, instances);
  }, [instances]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, instances.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} />
      </instancedMesh>

      {/* Water Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]} receiveShadow>
        <planeGeometry args={[WORLD_RADIUS * 2 + 20, WORLD_RADIUS * 2 + 20]} />
        <meshStandardMaterial
          color="#42a7ff"
          transparent
          opacity={0.7}
          roughness={0.0}
          metalness={0.3}
        />
      </mesh>

      {/* Bedrock layer to prevent holes when surface is mined (visual only) */}
      <mesh position={[0, -5, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_RADIUS * 2 + 10, WORLD_RADIUS * 2 + 10]} />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
});
World.displayName = "World";
