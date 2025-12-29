import { describe, expect, test } from "vitest";

import { BlockId, DEFAULT_GENERATION_CONFIG, World } from "../../voxel/World";
import { canSpawnAt, createGameEcs, mobSpawnSystem } from "./gameEcs";

const baseOptions = {
  seed: 9,
  viewDistanceChunks: 0,
  chunkSize: { x: 16, y: 32, z: 16 },
  generation: {
    caves: { ...DEFAULT_GENERATION_CONFIG.caves, enabled: false },
    ores: [],
  },
};

function setBlock(world: World, x: number, y: number, z: number, id: BlockId) {
  const oldId = world.getBlock(x, y, z);
  if (oldId === id) return;
  world.setBlock(x, y, z, id);
  world.handleBlockChanged(x, y, z, oldId, id);
}

function prepareFlatArea(
  world: World,
  startX: number,
  startZ: number,
  size: number,
  y: number,
) {
  const maxY = world.chunkSize.y - 1;
  for (let z = startZ; z < startZ + size; z++) {
    for (let x = startX; x < startX + size; x++) {
      setBlock(world, x, y - 1, z, BlockId.Stone);
      for (let yy = y; yy <= maxY; yy++) {
        setBlock(world, x, yy, z, BlockId.Air);
      }
    }
  }
  world.processLightQueue(100000);
}

function prepareDarkPocket(world: World, x: number, y: number, z: number) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      setBlock(world, x + dx, y, z + dz, BlockId.Stone);
      setBlock(world, x + dx, y + 1, z + dz, BlockId.Stone);
    }
  }
  setBlock(world, x, y, z, BlockId.Air);
  setBlock(world, x, y - 1, z, BlockId.Stone);
  world.processLightQueue(100000);
}

describe("mob spawning rules", () => {
  test("rejects sunlit positions", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);
    const y = world.chunkSize.y - 3;
    prepareFlatArea(world, 3, 3, 1, y);
    const x = 3;
    const z = 3;
    expect(canSpawnAt(world, x, y, z, 7)).toBe(false);
  });

  test("allows dark positions over solid ground", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);
    const y = 6;
    prepareDarkPocket(world, 4, y, 4);
    const x = 4;
    const z = 4;
    expect(canSpawnAt(world, x, y, z, 7)).toBe(true);
  });

  test("respects global mob cap", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);
    const y = 6;
    prepareDarkPocket(world, 4, y, 4);
    const x = 4;
    const z = 4;

    const ecs = createGameEcs(60, undefined, {
      voxelWorld: world,
      seed: 123,
      mobs: {
        spawnInterval: 0,
        spawnAttempts: 2,
        maxMobs: 1,
        maxMobsPerChunk: 1,
        minDistance: 0,
        maxDistance: 0,
        lightThreshold: 7,
      },
    });

    ecs.entities.player.position = { x: x + 0.5, y, z: z + 0.5 };
    mobSpawnSystem(ecs, 1);
    expect(Array.from(ecs.queries.mobs).length).toBe(1);

    mobSpawnSystem(ecs, 1);
    expect(Array.from(ecs.queries.mobs).length).toBe(1);
  });
});
