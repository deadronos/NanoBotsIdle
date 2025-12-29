import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import type { Color, InstancedMesh } from 'three';
import { Matrix4, Object3D, Vector3 } from 'three';

import { useGameStore } from '../store';
import { getVoxelColor, getVoxelValue, noise2D } from '../utils';

export interface WorldApi {
  getRandomTarget: () => { index: number; position: Vector3; value: number } | null;
  mineBlock: (index: number) => number; // Returns value mined
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WorldProps {}

const WORLD_RADIUS = 30; // Slightly reduced for performance with many drones

export const World = forwardRef<WorldApi, WorldProps>((props, ref) => {
  const meshRef = useRef<InstancedMesh>(null);
  const waterMeshRef = useRef<InstancedMesh>(null);
  
  const setTotalBlocks = useGameStore(state => state.setTotalBlocks);
  const incrementMinedBlocks = useGameStore(state => state.incrementMinedBlocks);
  const prestigeLevel = useGameStore(state => state.prestigeLevel);
  const seed = 123 + prestigeLevel * 99; // Change seed on prestige

  // Generate the terrain data
  const { instances, waterInstances } = useMemo(() => {
    const tempInstances: { x: number; y: number; z: number; color: Color; value: number; id: number }[] = [];
    const tempWater: { x: number; y: number; z: number }[] = [];
    let idCounter = 0;

    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x++) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z++) {
        const rawNoise = noise2D(x, z, seed);
        const h = Math.floor(rawNoise * 3);
        
        // Surface Block (Mineable)
        tempInstances.push({
            x,
            y: h,
            z,
            color: getVoxelColor(h),
            value: getVoxelValue(h),
            id: idCounter++
        });

        // Fill gaps below (Not mineable for simplicity in this version, or we assume infinite depth)
        // For visual sake, we only mine the top crust in this game loop
        if (h > -2) {
             // We add 'bedrock' visual but don't add it to the mineable instances array to keep logic simple
        }

        const waterLevel = -1;
        if (h <= waterLevel) {
            for (let wh = h + 1; wh <= 0; wh++) {
                 tempWater.push({ x, y: wh, z });
            }
        }
      }
    }
    return { instances: tempInstances, waterInstances: tempWater };
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
                    value: data.value
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
    }
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

  useLayoutEffect(() => {
    if (!waterMeshRef.current) return;
    const dummy = new Object3D();
    waterInstances.forEach((data, i) => {
      dummy.position.set(data.x, data.y, data.z);
      dummy.updateMatrix();
      waterMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    waterMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [waterInstances]);

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

      <instancedMesh
        ref={waterMeshRef}
        args={[undefined, undefined, waterInstances.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
            color="#42a7ff" 
            transparent 
            opacity={0.6} 
            roughness={0.1} 
            metalness={0.1} 
        />
      </instancedMesh>
      
      {/* Bedrock layer to prevent holes when surface is mined (visual only) */}
      <mesh position={[0, -5, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[WORLD_RADIUS * 2 + 10, WORLD_RADIUS * 2 + 10]} />
         <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
});
World.displayName = 'World';
