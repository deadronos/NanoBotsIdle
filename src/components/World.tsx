import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { Color, InstancedMesh } from "three";
import { Matrix4, Object3D, Vector3 } from "three";

import { useGameStore } from "../store";
import { getVoxelColor, getVoxelValue, noise2D } from "../utils";

export interface WorldApi {
  getRandomTarget: () => { index: number; position: Vector3; value: number } | null;
  mineBlock: (index: number) => number; // Returns value mined
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WorldProps {}

const WORLD_RADIUS = 30; // Slightly reduced for performance with many drones

export const World = forwardRef<WorldApi, WorldProps>((props, ref) => {
  const meshRef = useRef<InstancedMesh>(null);

  const setTotalBlocks = useGameStore((state) => state.setTotalBlocks);
  const incrementMinedBlocks = useGameStore((state) => state.incrementMinedBlocks);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const seed = 123 + prestigeLevel * 99; // Change seed on prestige

  // Generate the terrain data
  const instances = useMemo(() => {
    const tempInstances: {
      x: number;
      y: number;
      z: number;
      color: Color;
      value: number;
      id: number;
    }[] = [];
    let idCounter = 0;

    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x++) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z++) {
        const rawNoise = noise2D(x, z, seed);
        // Reduce water by adding a positive bias (+0.6)
        const h = Math.floor((rawNoise + 0.6) * 4);

        // Surface Block (Mineable)
        // Only generate blocks if they are above water-ish level or we want a visible floor
        // But for optimization, let's keep generating all 'terrain' that is solid
        tempInstances.push({
          x,
          y: h,
          z,
          color: getVoxelColor(h),
          value: getVoxelValue(h),
          id: idCounter++,
        });
      }
    }
    return tempInstances;
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

      // Update visual: Scale to 0
      const mesh = meshRef.current;
      if (mesh) {
        const matrix = new Matrix4();
        mesh.getMatrixAt(index, matrix);
        matrix.scale(new Vector3(0, 0, 0)); // Hide it
        mesh.setMatrixAt(index, matrix);
        mesh.instanceMatrix.needsUpdate = true;
      }

      return instances[index].value;
    },
  }));

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();

    // Reset all matrices
    instances.forEach((data, i) => {
      dummy.position.set(data.x, data.y, data.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, data.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} receiveShadow>
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
