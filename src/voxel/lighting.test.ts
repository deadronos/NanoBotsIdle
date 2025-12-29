import { describe, expect, test } from "vitest";

import { BlockId, DEFAULT_GENERATION_CONFIG, World } from "./World";

const baseOptions = {
  seed: 1337,
  viewDistanceChunks: 1,
  chunkSize: { x: 16, y: 32, z: 16 },
  generation: {
    caves: { ...DEFAULT_GENERATION_CONFIG.caves, enabled: false },
    ores: [],
  },
};

function flushLightQueue(world: World) {
  world.processLightQueue(100000);
}

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
  flushLightQueue(world);
}

describe("lighting propagation", () => {
  test("torch block light propagates and clears", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);

    const y = world.chunkSize.y - 3;
    prepareFlatArea(world, 2, 2, 3, y);
    const x = 3;
    const z = 3;
    const oldId = world.getBlock(x, y, z);

    world.setBlock(x, y, z, BlockId.Torch);
    world.handleBlockChanged(x, y, z, oldId, BlockId.Torch);
    flushLightQueue(world);

    expect(world.getLight("block", x, y, z)).toBe(14);
    expect(world.getLight("block", x + 1, y, z)).toBe(13);

    world.setBlock(x, y, z, BlockId.Air);
    world.handleBlockChanged(x, y, z, BlockId.Torch, BlockId.Air);
    flushLightQueue(world);

    expect(world.getLight("block", x, y, z)).toBe(0);
    expect(world.getLight("block", x + 1, y, z)).toBe(0);
  });

  test("block light crosses chunk boundaries", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);
    world.ensureChunk(1, 0);

    const edgeX = world.chunkSize.x - 1;
    const y = world.chunkSize.y - 3;
    prepareFlatArea(world, edgeX, 2, 2, y);
    const z = 3;

    world.setBlock(edgeX, y, z, BlockId.Torch);
    world.handleBlockChanged(edgeX, y, z, BlockId.Air, BlockId.Torch);
    flushLightQueue(world);

    expect(world.getLight("block", edgeX + 1, y, z)).toBe(13);
  });

  test("sunlight column updates on occlusion change", () => {
    const world = new World(baseOptions);
    world.ensureChunk(0, 0);

    const y = world.chunkSize.y - 4;
    prepareFlatArea(world, 5, 5, 1, y);
    const x = 5;
    const z = 5;
    expect(world.getLight("sun", x, y, z)).toBe(15);

    world.setBlock(x, y + 1, z, BlockId.Stone);
    world.handleBlockChanged(x, y + 1, z, BlockId.Air, BlockId.Stone);
    flushLightQueue(world);
    expect(world.getLight("sun", x, y, z)).toBeLessThan(15);

    world.setBlock(x, y + 1, z, BlockId.Air);
    world.handleBlockChanged(x, y + 1, z, BlockId.Stone, BlockId.Air);
    flushLightQueue(world);
    expect(world.getLight("sun", x, y, z)).toBe(15);
  });
});
