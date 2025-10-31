// Animation utilities for visual effects

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'production' | 'heat' | 'construction';
}

export interface DroneTrail {
  droneId: number;
  points: Array<{ x: number; y: number; alpha: number }>;
  maxLength: number;
}

export interface BuildingAnimation {
  entityId: number;
  type: 'construction' | 'production' | 'failure';
  startTime: number;
  duration: number;
  progress: number;
}

export class AnimationManager {
  private particles: ParticleEffect[] = [];
  private droneTrails: Map<number, DroneTrail> = new Map();
  private buildingAnimations: Map<number, BuildingAnimation> = new Map();
  private lastUpdateTime: number = 0;

  constructor() {
    this.lastUpdateTime = performance.now();
  }

  update(currentTime: number): void {
    const dt = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      return particle.life > 0;
    });

    // Update drone trails
    this.droneTrails.forEach(trail => {
      trail.points.forEach(point => {
        point.alpha = Math.max(0, point.alpha - dt * 2);
      });
      trail.points = trail.points.filter(p => p.alpha > 0);
    });

    // Update building animations
    this.buildingAnimations.forEach((anim, entityId) => {
      anim.progress = Math.min(1, (currentTime - anim.startTime) / anim.duration);
      if (anim.progress >= 1) {
        this.buildingAnimations.delete(entityId);
      }
    });
  }

  addParticle(particle: Omit<ParticleEffect, 'id'>): void {
    this.particles.push({
      ...particle,
      id: `particle_${Date.now()}_${Math.random()}`
    });
  }

  addProductionParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 20;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 1 + Math.random() * 2,
        type: 'production'
      });
    }
  }

  addConstructionParticles(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 25;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.7,
        maxLife: 1.5,
        color: '#fbbf24',
        size: 2 + Math.random() * 2,
        type: 'construction'
      });
    }
  }

  addHeatParticles(x: number, y: number, intensity: number): void {
    const count = Math.floor(intensity * 5);
    for (let i = 0; i < count; i++) {
      this.addParticle({
        x,
        y: y - 5,
        vx: (Math.random() - 0.5) * 10,
        vy: -20 - Math.random() * 20,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color: intensity > 0.8 ? '#ef4444' : '#f97316',
        size: 1.5 + Math.random() * 1.5,
        type: 'heat'
      });
    }
  }

  updateDroneTrail(droneId: number, x: number, y: number): void {
    let trail = this.droneTrails.get(droneId);
    if (!trail) {
      trail = {
        droneId,
        points: [],
        maxLength: 15
      };
      this.droneTrails.set(droneId, trail);
    }

    // Only add point if drone has moved
    const lastPoint = trail.points[trail.points.length - 1];
    if (!lastPoint || Math.abs(lastPoint.x - x) > 0.5 || Math.abs(lastPoint.y - y) > 0.5) {
      trail.points.push({ x, y, alpha: 1 });
      if (trail.points.length > trail.maxLength) {
        trail.points.shift();
      }
    }
  }

  removeDroneTrail(droneId: number): void {
    this.droneTrails.delete(droneId);
  }

  startBuildingAnimation(entityId: number, type: BuildingAnimation['type'], duration: number): void {
    this.buildingAnimations.set(entityId, {
      entityId,
      type,
      startTime: performance.now(),
      duration,
      progress: 0
    });
  }

  getBuildingAnimation(entityId: number): BuildingAnimation | undefined {
    return this.buildingAnimations.get(entityId);
  }

  getParticles(): ParticleEffect[] {
    return this.particles;
  }

  getDroneTrails(): DroneTrail[] {
    return Array.from(this.droneTrails.values());
  }

  clear(): void {
    this.particles = [];
    this.droneTrails.clear();
    this.buildingAnimations.clear();
  }
}
