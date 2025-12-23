import * as THREE from "three";

import { BlockId } from "../voxel/World";

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  ttl: number;
  color: THREE.Color;
};

const DEFAULT_COLOR = new THREE.Color(0xcfc4a9);
const BLOCK_COLORS: Partial<Record<BlockId, THREE.Color>> = {
  [BlockId.Grass]: new THREE.Color(0x7fbf6a),
  [BlockId.Dirt]: new THREE.Color(0x8b6238),
  [BlockId.Stone]: new THREE.Color(0x9ca1a8),
  [BlockId.Sand]: new THREE.Color(0xd6c289),
  [BlockId.Wood]: new THREE.Color(0xb88758),
  [BlockId.Leaves]: new THREE.Color(0x6bbf73),
  [BlockId.CoalOre]: new THREE.Color(0x8a8f96),
  [BlockId.IronOre]: new THREE.Color(0xc49a6c),
  [BlockId.GoldOre]: new THREE.Color(0xd2b14c),
  [BlockId.DiamondOre]: new THREE.Color(0x6bd6d1),
};

export class BreakParticleSystem {
  private particles: Particle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number;
  private gravity = -6;

  constructor(scene: THREE.Scene, maxParticles = 180) {
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  spawnBurst(position: THREE.Vector3, blockId: BlockId, count = 12): void {
    const baseColor = BLOCK_COLORS[blockId] ?? DEFAULT_COLOR;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        1.2 + Math.random() * 1.4,
        (Math.random() - 0.5) * 2,
      );
      this.particles.push({
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
          ),
        ),
        velocity,
        age: 0,
        ttl: 0.7 + Math.random() * 0.5,
        color: baseColor.clone(),
      });
    }
  }

  update(dt: number): void {
    if (this.particles.length === 0) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const next: Particle[] = [];
    let idx = 0;
    for (const particle of this.particles) {
      particle.age += dt;
      if (particle.age >= particle.ttl) continue;
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

    this.particles = next;
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
