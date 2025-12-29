import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { InstancedMesh, PointLight } from "three";
import { Color, Vector3 } from "three";

import { getConfig } from "../config/index";
import { setInstanceColor, setInstanceTransform } from "../render/instanced";
import { getSimBridge } from "../simBridge/simBridge";
import { getVoxelColor } from "../utils";

// --- Particle System ---

interface ParticleHandle {
  spawn: (pos: Vector3, color: Color) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ParticlesProps {}

const Particles = forwardRef<ParticleHandle, ParticlesProps>((props, ref) => {
  const meshRef = useRef<InstancedMesh>(null);

  const cfg = getConfig();
  const MAX_PARTICLES = cfg.drones.particle.maxParticles;

  const particles = useMemo(() => {
    return new Array(MAX_PARTICLES).fill(0).map(() => ({
      position: new Vector3(),
      velocity: new Vector3(),
      life: 0,
      maxLife: 1,
      scale: 0,
      color: new Color(),
    }));
  }, [MAX_PARTICLES]);

  useEffect(() => {
    const handle = ref as React.MutableRefObject<ParticleHandle | null>;
    handle.current = {
      spawn: (pos: Vector3, color: Color) => {
        let idx = particles.findIndex((p) => p.life <= 0);
        if (idx === -1) idx = Math.floor(Math.random() * MAX_PARTICLES);

        const p = particles[idx];
        p.position.copy(pos);
        p.position.x += (Math.random() - 0.5) * 0.8;
        p.position.y += (Math.random() - 0.5) * 0.8;
        p.position.z += (Math.random() - 0.5) * 0.8;

        p.velocity.set(
          (Math.random() - 0.5) * cfg.drones.particle.maxVelocity,
          Math.random() * cfg.drones.particle.maxVelocity + cfg.drones.particle.upBiasBase,
          (Math.random() - 0.5) * cfg.drones.particle.maxVelocity,
        );

        p.life = cfg.drones.particle.lifeBase + Math.random() * cfg.drones.particle.lifeRandom;
        p.maxLife = p.life;
        p.scale = cfg.drones.particle.scaleBase + Math.random() * cfg.drones.particle.scaleRandom;
        p.color.copy(color);

        if (meshRef.current) {
          setInstanceColor(meshRef.current, idx, p.color);
        }
      },
    };

    return () => {
      handle.current = null;
    };
  }, [cfg.drones.particle.lifeBase, cfg.drones.particle.lifeRandom, cfg.drones.particle.maxVelocity, cfg.drones.particle.scaleBase, cfg.drones.particle.scaleRandom, cfg.drones.particle.upBiasBase, MAX_PARTICLES, particles, ref]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let needsUpdate = false;

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.velocity.y -= 15 * delta;
        p.position.addScaledVector(p.velocity, delta);
        p.life -= delta;

        const currentScale = p.scale * (p.life / p.maxLife);

        setInstanceTransform(meshRef.current!, i, {
          position: { x: p.position.x, y: p.position.y, z: p.position.z },
          scale: {
            x: Math.max(0, currentScale),
            y: Math.max(0, currentScale),
            z: Math.max(0, currentScale),
          },
        });
        needsUpdate = true;
      } else if (p.scale !== 0) {
        p.scale = 0;
        setInstanceTransform(meshRef.current!, i, { scale: { x: 0, y: 0, z: 0 } });
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
});
Particles.displayName = "Particles";

// --- Flash Effect System ---

interface FlashHandle {
  trigger: (pos: Vector3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FlashEffectProps {}

const FlashEffect = forwardRef<FlashHandle, FlashEffectProps>((props, ref) => {
  const lightsRef = useRef<(PointLight | null)[]>([]);

  const statesRef = useRef<{ active: boolean; age: number }[]>(
    new Array(10).fill(0).map(() => ({ active: false, age: 0 })),
  );

  const cursor = useRef(0);
  const poolSize = 10;

  useEffect(() => {
    const handle = ref as React.MutableRefObject<FlashHandle | null>;
    handle.current = {
      trigger: (pos: Vector3) => {
        const idx = cursor.current;
        cursor.current = (cursor.current + 1) % poolSize;

        const light = lightsRef.current[idx];
        if (light) {
          light.position.copy(pos);
          light.position.y += 0.5;
          light.visible = true;
          light.intensity = 10;
          statesRef.current[idx] = { active: true, age: 0 };
        }
      },
    };

    return () => {
      handle.current = null;
    };
  }, [ref]);

  useFrame((_, delta) => {
    statesRef.current.forEach((state, i) => {
      if (state.active) {
        state.age += delta;
        const duration = 0.4;

        if (state.age >= duration) {
          state.active = false;
          if (lightsRef.current[i]) lightsRef.current[i]!.visible = false;
        } else if (lightsRef.current[i]) {
          const t = 1 - state.age / duration;
          lightsRef.current[i]!.intensity = 10 * (t * t);
        }
      }
    });
  });

  return (
    <group>
      {Array.from({ length: poolSize }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lightsRef.current[i] = el;
          }}
          visible={false}
          color="#ffffaa"
          distance={6}
          decay={2}
        />
      ))}
    </group>
  );
});
FlashEffect.displayName = "FlashEffect";

export const Drones: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);
  const cfg = getConfig();
  const bridge = getSimBridge();
  const positionsRef = useRef<Float32Array | null>(null);
  const minedPositionsRef = useRef<Float32Array | null>(null);
  const droneCountRef = useRef(0);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      positionsRef.current = frame.delta.entities ?? null;
      minedPositionsRef.current = frame.delta.minedPositions ?? null;
    });
  }, [bridge]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = Math.max(0, droneCountRef.current);
    }
  }, []);

  const tempVec = useRef(new Vector3());
  const maxDrones = 200;

  useFrame((state) => {
    const mesh = meshRef.current;
    const positions = positionsRef.current;
    if (!mesh || !positions) return;

    const count = Math.floor(positions.length / 3);
    droneCountRef.current = count;
    mesh.count = count;

    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      const x = positions[base];
      const y = positions[base + 1];
      const z = positions[base + 2];
      const bob = Math.sin(state.clock.elapsedTime * 5 + i) * 0.05;

      setInstanceTransform(mesh, i, {
        position: { x, y: y + bob, z },
      });
    }

    mesh.instanceMatrix.needsUpdate = true;

    const minedPositions = minedPositionsRef.current;
    if (minedPositions && minedPositions.length > 0) {
      for (let i = 0; i < minedPositions.length; i += 3) {
        const pos = tempVec.current;
        pos.set(minedPositions[i], minedPositions[i + 1], minedPositions[i + 2]);
        const blockColor = getVoxelColor(pos.y);
        if (flashRef.current) {
          flashRef.current.trigger(pos);
        }
        if (particlesRef.current) {
          for (let j = 0; j < 8; j += 1) {
            particlesRef.current.spawn(pos, blockColor);
          }
        }
      }
      minedPositionsRef.current = null;
    }
  });

  return (
    <group>
      <Particles ref={particlesRef} />
      <FlashEffect ref={flashRef} />
      <instancedMesh ref={meshRef} args={[undefined, undefined, maxDrones]}>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial color="#00ffcc" emissive="#004444" roughness={0.2} />
      </instancedMesh>
    </group>
  );
};
