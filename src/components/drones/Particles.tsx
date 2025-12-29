import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import type { InstancedMesh } from "three";
import { Color, Vector3 } from "three";

import { getConfig } from "../../config/index";
import { setInstanceColor, setInstanceTransform } from "../../render/instanced";

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

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.velocity.y -= cfg.drones.particle.gravity * delta;
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
