import { describe, expect, test } from "vitest";

import { BlockId, type Chunk, type WorldGenerationConfig, World } from "./World";

const baseOptions = {
  viewDistanceChunks: 0,
  chunkSize: { x: 12, y: 40, z: 12 },
};

const testConfig: WorldGenerationConfig = {
  caves: {
    enabled: true,
    noiseScale: 0.1,
    threshold: 0.35,
    minY: 4,
    maxY: 28,
    protectSurface: true,
  },
  ores: [
    {
      id: BlockId.CoalOre,
      minY: 8,
      maxY: 18,
      attemptsPerChunk: 12,
      veinSizeMin: 3,
      veinSizeMax: 5,
    },
    {
      id: BlockId.IronOre,
      minY: 6,
      maxY: 16,
      attemptsPerChunk: 8,
      veinSizeMin: 2,
      veinSizeMax: 4,
    },
  ],
};

describe("world generation", () => {
  test("is deterministic for the same seed + chunk coords", () => {
    const worldA = new World({ seed: 4242, ...baseOptions, generation: testConfig });
    const worldB = new World({ seed: 4242, ...baseOptions, generation: testConfig });

    const chunkA = worldA.ensureChunk(0, 0);
    const chunkB = worldB.ensureChunk(0, 0);

    expect(chunkA.blocks).toEqual(chunkB.blocks);
  });

  test("is order independent for adjacent chunks", () => {
    const worldA = new World({ seed: 4242, ...baseOptions, generation: testConfig });
    worldA.ensureChunk(0, 0);
    worldA.ensureChunk(1, 0);

    const worldB = new World({ seed: 4242, ...baseOptions, generation: testConfig });
    worldB.ensureChunk(1, 0);
    worldB.ensureChunk(0, 0);

    expect(worldA.getChunk(0, 0)?.blocks).toEqual(worldB.getChunk(0, 0)?.blocks);
    expect(worldA.getChunk(1, 0)?.blocks).toEqual(worldB.getChunk(1, 0)?.blocks);
  });

  test("ore placement respects depth ranges even with reversed config", () => {
    const oreConfig: WorldGenerationConfig = {
      caves: {
        enabled: false,
        noiseScale: 0.08,
        threshold: 0.4,
        minY: 4,
        maxY: 28,
        protectSurface: true,
      },
      ores: [
        {
          id: BlockId.GoldOre,
          minY: 18,
          maxY: 6,
          attemptsPerChunk: 30,
          veinSizeMin: 2,
          veinSizeMax: 4,
          // Allow watery/sandy columns so this test always places ore in small chunks.
          replaceable: [BlockId.Air, BlockId.Dirt, BlockId.Stone, BlockId.Sand, BlockId.Water],
        },
      ],
    };

    const world = new World({ seed: 7, ...baseOptions, generation: oreConfig });
    const chunks = [
      world.ensureChunk(0, 0),
      world.ensureChunk(1, 0),
      world.ensureChunk(0, 1),
      world.ensureChunk(1, 1),
    ];
    const ys = chunks.flatMap((chunk) => findBlockYs(chunk, BlockId.GoldOre));
    expect(ys.length).toBeGreaterThan(0);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(6);
      expect(y).toBeLessThanOrEqual(18);
    }
  });
});

function findBlockYs(chunk: Chunk, id: BlockId): number[] {
  const ys: number[] = [];
  const { x: sx, y: sy, z: sz } = chunk.size;
  const stride = sx * sz;

  for (let y = 0; y < sy; y++) {
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const idx = x + sx * z + stride * y;
        if (chunk.blocks[idx] === id) ys.push(y);
      }
    }
  }

  return ys;
}
