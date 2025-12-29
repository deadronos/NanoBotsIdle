import type { Query, With } from "miniplex";
import { World as EcsWorld } from "miniplex";

import {
  ECS_ITEM_DEFAULTS,
  ECS_LIGHTING,
  ECS_MOB_DEFAULTS,
  ECS_MOB_SPAWN,
  ECS_PARTICLE_DEFAULTS,
} from "../../config/ecs";
import type { PlayerController } from "../../voxel/PlayerController";
import { SeededRng } from "../../voxel/generation/rng";
import { BlockId, BLOCKS, type World as VoxelWorld } from "../../voxel/World";

export type Vec3 = { x: number; y: number; z: number };

export type EntityKind = "player" | "time" | "lighting" | "mob" | "item" | "particle";

export type MobComponent = {
  type: "critter";
  wanderTimer: number;
  wanderInterval: number;
  speed: number;
};

export type ItemComponent = {
  itemId: number;
  count: number;
  bobPhase: number;
};

export type ParticleComponent = {
  type: "dust";
};

export type LifetimeComponent = {
  age: number;
  ttl: number;
};

export type LightingState = {
  timeOfDay: number;
  sunPhase: number;
  ambientIntensity: number;
  sunIntensity: number;
  sunPosition: Vec3;
  skyHsl: { h: number; s: number; l: number };
};

export type LightingConfig = {
  baseHue: number;
  saturation: number;
  lightnessBase: number;
  lightnessScale: number;
  ambientBase: number;
  ambientScale: number;
  sunBase: number;
  sunScale: number;
  sunOrbitRadius: number;
  sunHeightBase: number;
  sunHeightScale: number;
};

export type MobSpawnConfig = {
  spawnInterval: number;
  spawnAttempts: number;
  maxMobs: number;
  maxMobsPerChunk: number;
  minDistance: number;
  maxDistance: number;
  lightThreshold: number;
};

export type MobSpawnState = {
  timer: number;
  rng: SeededRng;
};

export type GameEntity = {
  kind: EntityKind;
  player?: true;
  position?: Vec3;
  velocity?: Vec3;
  seconds?: number;
  dayLength?: number;
  lighting?: LightingState;
  mob?: MobComponent;
  item?: ItemComponent;
  particle?: ParticleComponent;
  lifetime?: LifetimeComponent;
};

export type EntityFactory = (init?: Partial<GameEntity>) => GameEntity;
export type EntityRegistry = Record<EntityKind, EntityFactory>;

export type GameEcsConfig = {
  dayLength: number;
  lighting: LightingConfig;
  mobs: MobSpawnConfig;
};

export type GameEcs = {
  world: EcsWorld<GameEntity>;
  voxelWorld?: VoxelWorld;
  spawn: {
    mobs: MobSpawnState;
  };
  config: GameEcsConfig;
  registry: EntityRegistry;
  entities: {
    player: GameEntity;
    time: GameEntity;
    lighting: GameEntity;
  };
  queries: {
    players: Query<With<GameEntity, "player" | "position" | "velocity">>;
    time: Query<With<GameEntity, "seconds" | "dayLength">>;
    lighting: Query<With<GameEntity, "lighting">>;
    mobs: Query<With<GameEntity, "mob" | "position" | "velocity">>;
    items: Query<With<GameEntity, "item" | "position">>;
    particles: Query<With<GameEntity, "particle" | "position" | "velocity" | "lifetime">>;
    lifetimes: Query<With<GameEntity, "lifetime">>;
  };
  systems: EcsSystem[];
};

export type EcsSystem = (ecs: GameEcs, dt: number, controller: PlayerController) => void;

export type GameEcsOptions = {
  lighting?: Partial<LightingConfig>;
  mobs?: Partial<MobSpawnConfig>;
  voxelWorld?: VoxelWorld;
  seed?: number;
};

export function createGameEcs(
  dayLength: number,
  lighting?: Partial<LightingConfig>,
  options?: GameEcsOptions,
): GameEcs {
  const config: GameEcsConfig = {
    dayLength,
    lighting: { ...ECS_LIGHTING, ...lighting },
    mobs: { ...ECS_MOB_SPAWN, ...options?.mobs },
  };
  const world = new EcsWorld<GameEntity>();
  const registry = createEntityRegistry(config);
  const seed = options?.seed ?? options?.voxelWorld?.seed ?? 1337;
  const spawn = {
    mobs: {
      timer: 0,
      rng: new SeededRng(seed).fork("mob-spawn"),
    },
  };

  const player = world.add(registry.player());
  const time = world.add(registry.time());
  const lightingEntity = world.add(registry.lighting());

  const queries = {
    players: world.with("player", "position", "velocity"),
    time: world.with("seconds", "dayLength"),
    lighting: world.with("lighting"),
    mobs: world.with("mob", "position", "velocity"),
    items: world.with("item", "position"),
    particles: world.with("particle", "position", "velocity", "lifetime"),
    lifetimes: world.with("lifetime"),
  };

  const systems: EcsSystem[] = [
    timeSystem,
    playerSnapshotSystem,
    mobSpawnSystem,
    mobWanderSystem,
    mobMovementSystem,
    itemBobSystem,
    particleSystem,
    lifetimeSystem,
    lightingSystem,
  ];

  return {
    world,
    voxelWorld: options?.voxelWorld,
    spawn,
    config,
    registry,
    entities: { player, time, lighting: lightingEntity },
    queries,
    systems,
  };
}

export function stepGameEcs(ecs: GameEcs, dt: number, controller: PlayerController): void {
  for (const system of ecs.systems) {
    system(ecs, dt, controller);
  }
}

export function spawnEntity(ecs: GameEcs, kind: EntityKind, init?: Partial<GameEntity>): GameEntity {
  const entity = ecs.registry[kind](init);
  return ecs.world.add(entity);
}

export function despawnEntity(ecs: GameEcs, entity: GameEntity): void {
  ecs.world.remove(entity);
}

export function spawnMob(ecs: GameEcs, init?: Partial<GameEntity>): GameEntity {
  return spawnEntity(ecs, "mob", init);
}

export function spawnItem(ecs: GameEcs, init?: Partial<GameEntity>): GameEntity {
  return spawnEntity(ecs, "item", init);
}

export function spawnParticle(ecs: GameEcs, init?: Partial<GameEntity>): GameEntity {
  return spawnEntity(ecs, "particle", init);
}

export function getTimeOfDay(ecs: GameEcs): number {
  const time = ecs.entities.time;
  if (typeof time.seconds !== "number" || typeof time.dayLength !== "number") return 0;
  return (time.seconds / time.dayLength) % 1;
}

export function getLightingState(ecs: GameEcs): LightingState | undefined {
  return ecs.entities.lighting.lighting;
}

export function canSpawnAt(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number,
  lightThreshold: number,
): boolean {
  if (wy <= 0 || wy >= world.chunkSize.y) return false;
  const block = world.getBlock(wx, wy, wz);
  if (block !== BlockId.Air) return false;
  const below = world.getBlock(wx, wy - 1, wz);
  if (!BLOCKS[below]?.solid) return false;
  const light = world.getLightAt(wx, wy, wz);
  return light < lightThreshold;
}

export function createLightingState(
  config: LightingConfig,
  timeOfDay = 0,
): LightingState {
  const state: LightingState = {
    timeOfDay: 0,
    sunPhase: 0,
    ambientIntensity: config.ambientBase,
    sunIntensity: config.sunBase,
    sunPosition: { x: 0, y: 0, z: 0 },
    skyHsl: { h: config.baseHue, s: config.saturation, l: config.lightnessBase },
  };
  updateLightingState(state, timeOfDay, config);
  return state;
}

export function updateLightingState(
  state: LightingState,
  timeOfDay: number,
  config: LightingConfig,
): void {
  const wrapped = ((timeOfDay % 1) + 1) % 1;
  const sunPhase = Math.sin(wrapped * Math.PI * 2) * 0.5 + 0.5;
  const angle = wrapped * Math.PI * 2;

  state.timeOfDay = wrapped;
  state.sunPhase = sunPhase;
  state.ambientIntensity = config.ambientBase + sunPhase * config.ambientScale;
  state.sunIntensity = config.sunBase + sunPhase * config.sunScale;
  state.sunPosition.x = Math.cos(angle) * config.sunOrbitRadius;
  state.sunPosition.y = config.sunHeightBase + sunPhase * config.sunHeightScale;
  state.sunPosition.z = Math.sin(angle) * config.sunOrbitRadius;
  state.skyHsl.h = config.baseHue;
  state.skyHsl.s = config.saturation;
  state.skyHsl.l = config.lightnessBase + sunPhase * config.lightnessScale;
}

function createEntityRegistry(config: GameEcsConfig): EntityRegistry {
  return {
    player: (init) => ({
      kind: "player",
      player: true,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      ...init,
    }),
    time: (init) => ({
      kind: "time",
      seconds: 0,
      dayLength: config.dayLength,
      ...init,
    }),
    lighting: (init) => ({
      kind: "lighting",
      lighting: createLightingState(config.lighting, 0),
      ...init,
    }),
    mob: (init) => ({
      kind: "mob",
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      mob: {
        type: "critter",
        wanderTimer: 0,
        wanderInterval: ECS_MOB_DEFAULTS.wanderInterval,
        speed: ECS_MOB_DEFAULTS.speed,
      },
      ...init,
    }),
    item: (init) => ({
      kind: "item",
      position: { x: 0, y: 0, z: 0 },
      item: {
        itemId: 0,
        count: 1,
        bobPhase: 0,
      },
      ...init,
    }),
    particle: (init) => ({
      kind: "particle",
      position: { x: 0, y: 0, z: 0 },
      velocity: {
        x: ECS_PARTICLE_DEFAULTS.velocity.x,
        y: ECS_PARTICLE_DEFAULTS.velocity.y,
        z: ECS_PARTICLE_DEFAULTS.velocity.z,
      },
      particle: {
        type: "dust",
      },
      lifetime: {
        age: 0,
        ttl: ECS_PARTICLE_DEFAULTS.ttl,
      },
      ...init,
    }),
  };
}

function timeSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.time) {
    if (typeof entity.seconds !== "number") continue;
    entity.seconds += dt;
  }
}

function playerSnapshotSystem(ecs: GameEcs, _dt: number, controller: PlayerController) {
  for (const entity of ecs.queries.players) {
    if (!entity.position || !entity.velocity) continue;
    entity.position.x = controller.position.x;
    entity.position.y = controller.position.y;
    entity.position.z = controller.position.z;
    entity.velocity.x = controller.velocity.x;
    entity.velocity.y = controller.velocity.y;
    entity.velocity.z = controller.velocity.z;
  }
}

export function mobSpawnSystem(ecs: GameEcs, dt: number) {
  const world = ecs.voxelWorld;
  if (!world) return;

  const state = ecs.spawn.mobs;
  const config = ecs.config.mobs;
  state.timer += dt;
  if (state.timer < config.spawnInterval) return;
  state.timer -= config.spawnInterval;

  const player = ecs.entities.player.position;
  if (!player) return;

  let mobCount = 0;
  const mobCounts = new Map<string, number>();
  for (const entity of ecs.queries.mobs) {
    const pos = entity.position;
    if (!pos) continue;
    mobCount += 1;
    const { cx, cz } = world.worldToChunk(Math.floor(pos.x), Math.floor(pos.z));
    const key = world.key(cx, cz);
    mobCounts.set(key, (mobCounts.get(key) ?? 0) + 1);
  }

  if (mobCount >= config.maxMobs) return;

  const minDistSq = config.minDistance * config.minDistance;
  const maxDist = Math.max(config.minDistance, config.maxDistance);

  for (let attempt = 0; attempt < config.spawnAttempts; attempt++) {
    if (mobCount >= config.maxMobs) break;
    const angle = state.rng.range(0, Math.PI * 2);
    const radius = state.rng.range(config.minDistance, maxDist);
    const tx = Math.floor(player.x + Math.cos(angle) * radius);
    const tz = Math.floor(player.z + Math.sin(angle) * radius);
    const dx = tx + 0.5 - player.x;
    const dz = tz + 0.5 - player.z;
    if (dx * dx + dz * dz < minDistSq) continue;

    const { cx, cz } = world.worldToChunk(tx, tz);
    const chunk = world.getChunk(cx, cz);
    if (!chunk) continue;
    const key = world.key(cx, cz);
    if ((mobCounts.get(key) ?? 0) >= config.maxMobsPerChunk) continue;

    const spawnY = findSpawnY(world, tx, tz);
    if (spawnY == null) continue;
    if (!canSpawnAt(world, tx, spawnY, tz, config.lightThreshold)) continue;

    spawnMob(ecs, {
      position: { x: tx + 0.5, y: spawnY, z: tz + 0.5 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    mobCount += 1;
    mobCounts.set(key, (mobCounts.get(key) ?? 0) + 1);
  }
}

function mobWanderSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.mobs) {
    const mob = entity.mob;
    if (!mob || !entity.velocity) continue;
    mob.wanderTimer += dt;
    if (mob.wanderTimer >= mob.wanderInterval) {
      mob.wanderTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      entity.velocity.x = Math.cos(angle) * mob.speed;
      entity.velocity.z = Math.sin(angle) * mob.speed;
    }
  }
}

function mobMovementSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.mobs) {
    if (!entity.position || !entity.velocity) continue;
    entity.position.x += entity.velocity.x * dt;
    entity.position.y += entity.velocity.y * dt;
    entity.position.z += entity.velocity.z * dt;
  }
}

function itemBobSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.items) {
    if (!entity.item) continue;
    entity.item.bobPhase =
      (entity.item.bobPhase + dt * ECS_ITEM_DEFAULTS.bobSpeed) % (Math.PI * 2);
  }
}

function particleSystem(ecs: GameEcs, dt: number) {
  for (const entity of ecs.queries.particles) {
    if (!entity.position || !entity.velocity) continue;
    entity.position.x += entity.velocity.x * dt;
    entity.position.y += entity.velocity.y * dt;
    entity.position.z += entity.velocity.z * dt;
  }
}

function lifetimeSystem(ecs: GameEcs, dt: number) {
  const expired: GameEntity[] = [];
  for (const entity of ecs.queries.lifetimes) {
    if (!entity.lifetime) continue;
    entity.lifetime.age += dt;
    if (entity.lifetime.age >= entity.lifetime.ttl) {
      expired.push(entity);
    }
  }
  for (const entity of expired) {
    ecs.world.remove(entity);
  }
}

function lightingSystem(ecs: GameEcs, _dt: number) {
  const timeOfDay = getTimeOfDay(ecs);
  for (const entity of ecs.queries.lighting) {
    if (!entity.lighting) continue;
    updateLightingState(entity.lighting, timeOfDay, ecs.config.lighting);
  }
}

function findSpawnY(world: VoxelWorld, wx: number, wz: number): number | null {
  const maxY = world.chunkSize.y - 1;
  for (let y = maxY; y >= 1; y--) {
    const block = world.getBlock(wx, y, wz);
    if (block !== BlockId.Air) continue;
    const below = world.getBlock(wx, y - 1, wz);
    if (BLOCKS[below]?.solid) return y;
  }
  return null;
}
