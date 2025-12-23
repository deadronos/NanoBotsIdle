import * as THREE from "three";

import { PARTICLES } from "../config/particles";
import { BlockId } from "../voxel/World";
import { BLOCK_COLORS, DEFAULT_BLOCK_COLOR } from "./blockColors";

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  ttl: number;
  color: THREE.Color;
};


export class BreakParticleSystem {
  private particles: Particle[] = [];
  private nextParticles: Particle[] = [];
  private particlePool: Particle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number;
  private gravity = PARTICLES.gravity;

  constructor(scene: THREE.Scene, maxParticles = PARTICLES.maxParticles) {
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: PARTICLES.size,
      vertexColors: true,
      transparent: true,
      opacity: PARTICLES.opacity,
      depthWrite: PARTICLES.depthWrite,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  spawnBurst(position: THREE.Vector3, blockId: BlockId, count = 12): void {
    const baseColor = BLOCK_COLORS[blockId] ?? DEFAULT_BLOCK_COLOR;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const particle = this.particlePool.pop() ?? createParticle();
      particle.position.set(
        position.x + (Math.random() - 0.5) * 0.4,
        position.y + (Math.random() - 0.5) * 0.4,
        position.z + (Math.random() - 0.5) * 0.4,
      );
      particle.velocity.set(
        (Math.random() - 0.5) * 2,
        1.2 + Math.random() * 1.4,
        (Math.random() - 0.5) * 2,
      );
      particle.age = 0;
      particle.ttl = 0.7 + Math.random() * 0.5;
      particle.color.copy(baseColor);
      this.particles.push(particle);
    }
  }

  update(dt: number): void {
    if (this.particles.length === 0) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const next = this.nextParticles;
    next.length = 0;
    let idx = 0;
    for (const particle of this.particles) {
      particle.age += dt;
      if (particle.age >= particle.ttl) {
        this.particlePool.push(particle);
        continue;
      }
      particle.velocity.y += this.gravity * dt;
      particle.position.addScaledVector(particle.velocity, dt);
      particle.velocity.multiplyScalar(0.96);

      const fade = 1 - particle.age / particle.ttl;
      const posIndex = idx * 3;
      this.positions[posIndex] = particle.position.x;
      this.positions[posIndex + 1] = particle.position.y;
      this.positions[posIndex + 2] = particle.position.z;
      this.colors[posIndex] = particle.color.r * fade;
      this.colors[posIndex + 1] = particle.color.g * fade;
      this.colors[posIndex + 2] = particle.color.b * fade;

      idx += 1;
      next.push(particle);
    }

    const prev = this.particles;
    this.particles = next;
    this.nextParticles = prev;
    this.geometry.setDrawRange(0, idx);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

function createParticle(): Particle {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    age: 0,
    ttl: 0,
    color: new THREE.Color(),
  };
}
