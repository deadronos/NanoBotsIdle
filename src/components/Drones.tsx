import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import type { Group, InstancedMesh, Mesh, MeshBasicMaterial, PointLight } from "three";
import { Color, Vector3 } from "three";

import { setInstanceColor,setInstanceTransform } from "../render/instanced";
import { useGameStore } from "../store";
import { getVoxelColor } from "../utils";
import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { getConfig } from "../config/index";
import type { WorldApi } from "./World";

interface DronesProps {
  worldRef: React.RefObject<WorldApi | null>;
}

type DroneState = "SEEKING" | "MOVING" | "MINING";

class DroneAgent {
  id: number;
  position: Vector3;
  targetPos: Vector3 | null;
  targetIndex: number;
  state: DroneState;
  miningTimer: number;

  constructor(id: number, startBase = 15, startRandom = 5) {
    this.id = id;
    this.position = new Vector3(0, startBase + Math.random() * startRandom, 0); // Start high
    this.targetPos = null;
    this.targetIndex = -1;
    this.state = "SEEKING";
    this.miningTimer = 0;
  }
}

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

  // Particle State
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

  useImperativeHandle(ref, () => ({
    spawn: (pos: Vector3, color: Color) => {
      // Find a dead particle or overwrite the oldest (simple circular buffer or random search)
      // For simplicity, we just search for first available or random if full
      let idx = particles.findIndex((p) => p.life <= 0);
      if (idx === -1) idx = Math.floor(Math.random() * MAX_PARTICLES);

      const p = particles[idx];
      p.position.copy(pos);
      // Randomize position slightly around the center of the block
      p.position.x += (Math.random() - 0.5) * 0.8;
      p.position.y += (Math.random() - 0.5) * 0.8;
      p.position.z += (Math.random() - 0.5) * 0.8;

      // Explosion velocity (config driven)
      p.velocity.set(
        (Math.random() - 0.5) * cfg.drones.particle.maxVelocity,
        Math.random() * cfg.drones.particle.maxVelocity + cfg.drones.particle.upBiasBase, // Upward bias
        (Math.random() - 0.5) * cfg.drones.particle.maxVelocity,
      );

      p.life = cfg.drones.particle.lifeBase + Math.random() * cfg.drones.particle.lifeRandom;
      p.maxLife = p.life;
      p.scale = cfg.drones.particle.scaleBase + Math.random() * cfg.drones.particle.scaleRandom;
      p.color.copy(color);

      // Initial update to mesh to prevent flicker
      if (meshRef.current) {
        setInstanceColor(meshRef.current, idx, p.color);
      }
    },
  }));


  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let needsUpdate = false;

    particles.forEach((p, i) => {
      if (p.life > 0) {
        // Physics
        p.velocity.y -= 15 * delta; // Gravity
        p.position.addScaledVector(p.velocity, delta);
        p.life -= delta;

        // Scale down as it dies
        const currentScale = p.scale * (p.life / p.maxLife);

        // Update instance matrix using shared helper to avoid allocations in hot paths
        setInstanceTransform(meshRef.current!, i, {
          position: { x: p.position.x, y: p.position.y, z: p.position.z },
          scale: { x: Math.max(0, currentScale), y: Math.max(0, currentScale), z: Math.max(0, currentScale) },
        });
        needsUpdate = true;
      } else if (p.scale !== 0) {
        // Hide dead particles
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

  // Initialize state ref with initial value to avoid useMemo side-effect warning
  const statesRef = useRef<{ active: boolean; age: number }[]>(
    new Array(10).fill(0).map(() => ({ active: false, age: 0 })),
  );

  const cursor = useRef(0);
  const poolSize = 10;

  useImperativeHandle(ref, () => ({
    trigger: (pos: Vector3) => {
      const idx = cursor.current;
      cursor.current = (cursor.current + 1) % poolSize;

      const light = lightsRef.current[idx];
      if (light) {
        light.position.copy(pos);
        // Center it slightly above the block center
        light.position.y += 0.5;
        light.visible = true;
        light.intensity = 10;
        statesRef.current[idx] = { active: true, age: 0 };
      }
    },
  }));

  useFrame((_, delta) => {
    statesRef.current.forEach((state, i) => {
      if (state.active) {
        state.age += delta;
        const duration = 0.4;

        if (state.age >= duration) {
          state.active = false;
          if (lightsRef.current[i]) lightsRef.current[i]!.visible = false;
        } else {
          if (lightsRef.current[i]) {
            // Exponential decay for impact feel
            const t = 1 - state.age / duration;
            lightsRef.current[i]!.intensity = 10 * (t * t);
          }
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
          color="#ffffaa" // Bright warm white
          distance={6}
          decay={2}
        />
      ))}
    </group>
  );
});
FlashEffect.displayName = "FlashEffect";

// --- Main Drone Logic ---

export const Drones: React.FC<DronesProps> = ({ worldRef }) => {
  const droneCount = useGameStore((state) => state.droneCount);
  const moveSpeedLevel = useGameStore((state) => state.moveSpeedLevel);
  const miningSpeedLevel = useGameStore((state) => state.miningSpeedLevel);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const addCredits = useGameStore((state) => state.addCredits);

  // Derived stats (config-driven)
  const cfg = getConfig();
  const moveSpeed = getDroneMoveSpeed(moveSpeedLevel, cfg);
  const mineDuration = getMineDuration(miningSpeedLevel, cfg);

  const dronesRef = useRef<DroneAgent[]>([]);
  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);

  // Sync drone count
  // Using useLayoutEffect to ensure refs are updated before painting
  // We use a state to force re-render if we really needed to, but droneCount change already triggered this.
  useLayoutEffect(() => {
    const current = dronesRef.current;
    const cfg = getConfig();
    if (current.length < droneCount) {
      for (let i = current.length; i < droneCount; i++) {
        current.push(new DroneAgent(i, cfg.drones.startHeightBase, cfg.drones.startHeightRandom));
      }
    } else if (current.length > droneCount) {
      dronesRef.current = current.slice(0, droneCount);
    }
  }, [droneCount]);

  useFrame((state, delta) => {
    if (!worldRef.current) return;

    dronesRef.current.forEach((drone) => {
      switch (drone.state) {
        case "SEEKING": {
          const target = worldRef.current!.getRandomTarget();
          if (target) {
            drone.targetIndex = target.index;
            drone.targetPos = target.position.clone();
            drone.state = "MOVING";
          }
          break;
        }
        case "MOVING": {
          if (!drone.targetPos) {
            drone.state = "SEEKING";
            break;
          }

          const dest = drone.targetPos.clone().add(new Vector3(0, 2, 0));
          const dir = dest.clone().sub(drone.position);
          const dist = dir.length();

          if (dist < 0.5) {
            drone.state = "MINING";
            drone.miningTimer = 0;
          } else {
            dir.normalize();
            drone.position.add(dir.multiplyScalar(moveSpeed * delta));
          }
          break;
        }
        case "MINING": {
          drone.miningTimer += delta;

          // Spawn particles while mining (rate limited slightly by random)
          if (drone.targetPos && particlesRef.current && Math.random() < 0.2) {
            const blockColor = getVoxelColor(drone.targetPos.y);
            particlesRef.current.spawn(drone.targetPos, blockColor);
          }

          if (drone.miningTimer >= mineDuration) {
            const value = worldRef.current!.mineBlock(drone.targetIndex);
            if (value > 0) {
              addCredits(value * prestigeLevel);

              // Success Effects
              if (drone.targetPos) {
                // 1. Flash Light
                if (flashRef.current) {
                  flashRef.current.trigger(drone.targetPos);
                }
                // 2. Particle Burst
                if (particlesRef.current) {
                  const blockColor = getVoxelColor(drone.targetPos.y);
                  for (let i = 0; i < 8; i++) {
                    particlesRef.current.spawn(drone.targetPos, blockColor);
                  }
                }
              }
            }
            drone.state = "SEEKING";
            drone.targetPos = null;
          }
          break;
        }
      }
    });
  });

  return (
    <group>
      <Particles ref={particlesRef} />
      <FlashEffect ref={flashRef} />
      {/* eslint-disable-next-line react-hooks/refs */}
      {dronesRef.current.slice(0, droneCount).map((drone) => (
        <DroneVisual key={drone.id} drone={drone} />
      ))}
    </group>
  );
};

const DroneVisual: React.FC<{ drone: DroneAgent }> = ({ drone }) => {
  const meshRef = useRef<Group>(null);
  const miningLaserRef = useRef<Mesh>(null);
  const scanningLaserRef = useRef<Mesh>(null);
  const targetBoxRef = useRef<Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const impactLightRef = useRef<any>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 1. Update Position
    meshRef.current.position.lerp(drone.position, 0.2);

    // 2. Bobbing animation
    meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 5 + drone.id) * 0.01;

    // 3. Rotation
    if (drone.targetPos && (drone.state === "MOVING" || drone.state === "MINING")) {
      meshRef.current.lookAt(drone.targetPos);
    }

    // 4. Visual Effects Update
    const isMining = drone.state === "MINING" && !!drone.targetPos;
    const isMoving = drone.state === "MOVING" && !!drone.targetPos;
    const hasTarget = !!drone.targetPos;

    // -- Mining Laser (High Energy) --
    if (miningLaserRef.current) {
      miningLaserRef.current.visible = isMining;
      if (isMining && drone.targetPos) {
        const localTarget = meshRef.current.worldToLocal(drone.targetPos.clone());
        // const start = new Vector3(0, 0, 0);
        const dist = localTarget.length(); // local origin to local target

        // Jitter width
        const jitter = 1 + Math.sin(state.clock.elapsedTime * 40) * 0.3;
        miningLaserRef.current.scale.set(1 * jitter, dist, 1 * jitter);

        // Position and Orient
        miningLaserRef.current.position.set(0, 0, 0).lerp(localTarget, 0.5);
        miningLaserRef.current.lookAt(localTarget);
        miningLaserRef.current.rotation.x += Math.PI / 2;

        // Pulsing Opacity
        const material = miningLaserRef.current.material as MeshBasicMaterial;
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 30) * 0.3;
      }
    }

    // -- Scanning/Lock-on Beam (Low Energy) --
    if (scanningLaserRef.current) {
      scanningLaserRef.current.visible = isMoving;
      if (isMoving && drone.targetPos) {
        const localTarget = meshRef.current.worldToLocal(drone.targetPos.clone());
        // const start = new Vector3(0, 0, 0);
        const dist = localTarget.length();

        // Thin steady beam
        scanningLaserRef.current.scale.set(1, dist, 1);

        scanningLaserRef.current.position.set(0, 0, 0).lerp(localTarget, 0.5);
        scanningLaserRef.current.lookAt(localTarget);
        scanningLaserRef.current.rotation.x += Math.PI / 2;

        const material = scanningLaserRef.current.material as MeshBasicMaterial;
        material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
      }
    }

    // -- Target Block Highlight Box --
    if (targetBoxRef.current) {
      targetBoxRef.current.visible = hasTarget;
      if (hasTarget && drone.targetPos) {
        // Convert world target pos to local for the box to stay at the target while parent moves
        const localTarget = meshRef.current.worldToLocal(drone.targetPos.clone());
        targetBoxRef.current.position.copy(localTarget);

        // Animation: pulse size
        const scale = 1.05 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
        targetBoxRef.current.scale.setScalar(scale);
        targetBoxRef.current.rotation.y += 0.02;

        // Color State
        const material = targetBoxRef.current.material as MeshBasicMaterial;
        if (isMining) {
          material.color.setHex(0xff3333); // Red when mining
        } else {
          material.color.setHex(0x00ffff); // Cyan when locking on
        }
      }
    }

    if (impactLightRef.current) {
      impactLightRef.current.visible = isMining;
      if (isMining && drone.targetPos) {
        const localTarget = meshRef.current.worldToLocal(drone.targetPos.clone());
        localTarget.y += 0.5;
        impactLightRef.current.position.copy(localTarget);

        // Flicker intensity
        impactLightRef.current.intensity = 2 + Math.random() * 3;
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Drone Body */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial color="#00ffcc" emissive="#004444" roughness={0.2} />
      </mesh>
      {/* Engine Glow */}
      <pointLight distance={3} intensity={0.5} color="cyan" />

      {/* Mining Laser Mesh (Cylinder) */}
      <mesh ref={miningLaserRef} visible={false}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#ff3333"
          transparent
          opacity={0.7}
          blending={2}
          depthWrite={false}
        />
      </mesh>

      {/* Scanning Laser Mesh (Thin Cylinder) */}
      <mesh ref={scanningLaserRef} visible={false}>
        <cylinderGeometry args={[0.015, 0.015, 1, 4, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          blending={2}
          depthWrite={false}
        />
      </mesh>

      {/* Target Highlight Box */}
      <mesh ref={targetBoxRef} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial wireframe color="#00ffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Impact Light */}
      <pointLight ref={impactLightRef} distance={4} decay={2} color="#ffaa00" />
    </group>
  );
};
