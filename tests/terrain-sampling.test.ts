import fs from "fs";
import path from "path";
import { expect, test } from "vitest";

import { getConfig } from "../src/config/index";
import { getSeed } from "../src/sim/seed";
import { generateInstances, getSurfaceHeight } from "../src/sim/terrain";
import { TERRAIN_COLORS } from "../src/sim/terrain-constants";
import { getVoxelColor } from "../src/sim/terrain-core";

const noiseTypes: ("sincos" | "open-simplex")[] = ["sincos", "open-simplex"];

noiseTypes.forEach((noiseType) => {
  test(`terrain sampling distribution report (${noiseType})`, () => {
    const seed = getSeed(1);
    const cfg = getConfig();
    // Temporarily set noise type
    const prev = cfg.terrain.noiseType;
    cfg.terrain.noiseType = noiseType;

    const voxels = generateInstances(seed, cfg.terrain.worldRadius);

    const counts: Record<string, number> = {
      deepWater: 0,
      water: 0,
      sand: 0,
      grass: 0,
      darkGrass: 0,
      rock: 0,
      snow: 0,
      other: 0,
    };

    let minY = Infinity;
    let maxY = -Infinity;

    for (const v of voxels) {
      const y = v.y;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const hexColor = getVoxelColor(y, cfg.terrain.waterLevel);
      switch (hexColor) {
        case TERRAIN_COLORS.DEEP_WATER:
          counts.deepWater++;
          break;
        case TERRAIN_COLORS.WATER:
          counts.water++;
          break;
        case TERRAIN_COLORS.SAND:
          counts.sand++;
          break;
        case TERRAIN_COLORS.GRASS:
          counts.grass++;
          break;
        case TERRAIN_COLORS.DARK_GRASS:
          counts.darkGrass++;
          break;
        case TERRAIN_COLORS.ROCK:
          counts.rock++;
          break;
        case TERRAIN_COLORS.SNOW:
          counts.snow++;
          break;
        default:
          counts.other++;
      }
    }

    const total = voxels.length || 1;

    console.log(`\nTerrain sampling report (${noiseType}):`);
    console.log(`seed: ${seed}`);
    console.log(
      `config: waterLevel=${cfg.terrain.waterLevel}, surfaceBias=${cfg.terrain.surfaceBias}, quantizeScale=${cfg.terrain.quantizeScale}, worldRadius=${cfg.terrain.worldRadius}`,
    );
    console.log(`voxels sampled: ${total}`);
    console.log(`height: min=${minY}, max=${maxY}`);
    console.log("counts:");
    Object.entries(counts).forEach(([k, v]) => {
      console.log(`  ${k}: ${v} (${((v / total) * 100).toFixed(2)}%)`);
    });

    // Export a simple top-down PPM for visual review
    const size = 121; // odd so center aligns with spawn
    const half = Math.floor(size / 2);
    const outDir = path.resolve(process.cwd(), "verification");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filename = path.join(outDir, `terrain-${noiseType}-seed${seed}.ppm`);
    const header = `P3\n${size} ${size}\n255\n`;
    const pixels: string[] = [];

    for (let iz = -half; iz <= half; iz++) {
      for (let ix = -half; ix <= half; ix++) {
        const x = ix;
        const z = iz;
        const v = generateInstances(seed, 0).find((vv) => vv.x === x && vv.z === z);
        // If not found, compute directly
        let y: number;
        if (v) y = v.y;
        else y = getSurfaceHeight(x, z, seed);

        const hexColor = getVoxelColor(y, cfg.terrain.waterLevel);
        const r = (hexColor >> 16) & 0xff;
        const g = (hexColor >> 8) & 0xff;
        const b = hexColor & 0xff;
        pixels.push(`${r} ${g} ${b}`);
      }
    }

    fs.writeFileSync(filename, header + pixels.join("\n"));
    console.log(`Wrote visual map to ${filename}`);

    // Sanity checks
    expect(total).toBeGreaterThan(0);
    // Ensure distribution sums correctly
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);

    // restore
    cfg.terrain.noiseType = prev;
  });
});
