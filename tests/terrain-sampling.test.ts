import { test, expect } from "vitest";
import { generateInstances, getSurfaceHeight } from "../src/sim/terrain";
import { getSeed } from "../src/sim/seed";
import { getConfig, updateConfig } from "../src/config/index";
import { getVoxelColor } from "../src/utils";
import { noise2D } from "../src/sim/terrain-core";

import fs from "fs";
import path from "path";

const noiseTypes: Array<"sincos" | "open-simplex"> = ["sincos", "open-simplex"];

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

      const hex = getVoxelColor(y, cfg.terrain.waterLevel).getHexString();
      switch (hex) {
        case "1a4d8c":
          counts.deepWater++;
          break;
        case "2d73bf":
          counts.water++;
          break;
        case "e3dba3":
          counts.sand++;
          break;
        case "59a848":
          counts.grass++;
          break;
        case "3b7032":
          counts.darkGrass++;
          break;
        case "6e6e6e":
          counts.rock++;
          break;
        case "ffffff":
          counts.snow++;
          break;
        default:
          counts.other++;
      }
    }

    const total = voxels.length || 1;

    console.log(`\nTerrain sampling report (${noiseType}):`);
    console.log(`seed: ${seed}`);
    console.log(`config: waterLevel=${cfg.terrain.waterLevel}, surfaceBias=${cfg.terrain.surfaceBias}, quantizeScale=${cfg.terrain.quantizeScale}, worldRadius=${cfg.terrain.worldRadius}`);
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
        else y = getSurfaceHeight(x, z, seed);        const color = getVoxelColor(y, cfg.terrain.waterLevel).getHexString();
        const r = parseInt(color.slice(0, 2), 16);
        const g = parseInt(color.slice(2, 4), 16);
        const b = parseInt(color.slice(4, 6), 16);
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
