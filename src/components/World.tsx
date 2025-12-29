import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { InstancedMesh } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { populateInstancedMesh, setInstanceTransform } from "../render/instanced";
import { getSimBridge } from "../simBridge/simBridge";
import { generateInstances, getSeed } from "../sim/terrain";
import { useUiStore } from "../ui/store";

export interface WorldApi {
  getRandomTarget: () => { index: number; position: Vector3; value: number } | null;
  mineBlock: (index: number) => number; // Returns value mined
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WorldProps {}

export const World = forwardRef<WorldApi, WorldProps>((props, ref) => {
  const meshRef = useRef<InstancedMesh>(null);

  const snapshot = useUiStore((state) => state.snapshot);
  const prestigeLevel = snapshot.prestigeLevel;
  const seed = getSeed(prestigeLevel); // Change seed on prestige
  const cfg = getConfig();
  const bridge = getSimBridge();

  const instances = useMemo(() => {
    return generateInstances(seed);
  }, [seed, cfg.terrain.worldRadius]);

  const minedIndices = useRef<Set<number>>(new Set());
  const instanceCount = instances.length;

  const mineBlockInternal = useCallback(
    (index: number) => {
      if (minedIndices.current.has(index)) return 0;
      minedIndices.current.add(index);

      const mesh = meshRef.current;
      if (mesh) {
        setInstanceTransform(mesh, index, { scale: { x: 0, y: 0, z: 0 } });
      }

      return instances[index]?.value ?? 0;
    },
    [instances],
  );

  useEffect(() => {
    const positions = new Float32Array(instanceCount * 3);
    const values = new Float32Array(instanceCount);

    for (let i = 0; i < instanceCount; i += 1) {
      const data = instances[i];
      const base = i * 3;
      positions[base] = data.x;
      positions[base + 1] = data.y;
      positions[base + 2] = data.z;
      values[i] = data.value;
    }

    bridge.enqueue({ t: "SET_TARGET_POOL", positions, values });
    minedIndices.current.clear();
  }, [bridge, instanceCount, instances]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      const mined = frame.delta.minedIndices;
      if (!mined || mined.length === 0) return;
      mined.forEach((index) => {
        mineBlockInternal(index);
      });
    });
  }, [bridge, mineBlockInternal]);

  useImperativeHandle(ref, () => ({
    getRandomTarget: () => {
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
    mineBlock: (index: number) => mineBlockInternal(index),
  }));

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    populateInstancedMesh(meshRef.current, instances);
  }, [instances]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, instances.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} />
      </instancedMesh>

      {/* Water Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cfg.terrain.waterLevel, 0]} receiveShadow>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 20, cfg.terrain.worldRadius * 2 + 20]} />
        <meshStandardMaterial color="#42a7ff" transparent opacity={0.7} roughness={0.0} metalness={0.3} />
      </mesh>

      {/* Bedrock layer to prevent holes when surface is mined (visual only) */}
      <mesh position={[0, -5, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 10, cfg.terrain.worldRadius * 2 + 10]} />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
});
World.displayName = "World";
