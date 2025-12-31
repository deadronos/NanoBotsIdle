import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import type { InstancedMesh } from "three";
import { Color, Object3D, Vector3 } from "three";

import { getConfig } from "../../config/index";
import { setInstanceColor } from "../../render/instanced";

export interface ParticleHandle {
  spawn: (pos: Vector3, color: Color) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParticlesProps {}

export const Particles = forwardRef<ParticleHandle, ParticlesProps>((props, ref) => {
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

  // Free-list for O(1) particle allocation
  const freeList = useRef<number[]>([]);

  // Initialize free-list with all indices
  useEffect(() => {
    freeList.current = [];
    for (let i = MAX_PARTICLES - 1; i >= 0; i -= 1) {
      freeList.current.push(i);
    }
  }, [MAX_PARTICLES]);

  const tmp = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const handle = ref as React.MutableRefObject<ParticleHandle | null>;
    handle.current = {
      spawn: (pos: Vector3, color: Color) => {
        // O(1) allocation from free-list
        let idx: number;
        if (freeList.current.length > 0) {
          idx = freeList.current.pop()!;
        } else {
          // Fallback to random if all particles are active
          idx = Math.floor(Math.random() * MAX_PARTICLES);
        }

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
  }, [
    MAX_PARTICLES,
    cfg.drones.particle.lifeBase,
    cfg.drones.particle.lifeRandom,
    cfg.drones.particle.maxVelocity,
    cfg.drones.particle.scaleBase,
    cfg.drones.particle.scaleRandom,
    cfg.drones.particle.upBiasBase,
    particles,
    ref,
  ]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let needsUpdate = false;

    const mesh = meshRef.current;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (p.life > 0) {
        p.velocity.y -= cfg.drones.particle.gravity * delta;
        p.position.addScaledVector(p.velocity, delta);
        p.life -= delta;

        const currentScale = p.scale * (p.life / p.maxLife);
        const scale = Math.max(0, currentScale);

        tmp.position.copy(p.position);
        tmp.scale.set(scale, scale, scale);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
        needsUpdate = true;
        continue;
      }

      if (p.scale !== 0) {
        p.scale = 0;
        tmp.position.copy(p.position);
        tmp.scale.set(0, 0, 0);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
        needsUpdate = true;
        // Return particle to free-list for O(1) reallocation
        freeList.current.push(i);
      }
    }

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
