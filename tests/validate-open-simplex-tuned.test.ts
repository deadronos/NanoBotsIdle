import fs from "fs";
import path from "path";
import { expect, test } from "vitest";

import { getConfig, updateConfig } from "../src/config/index";
import { getSeed } from "../src/sim/seed";
import { generateInstances } from "../src/sim/terrain";
import { getVoxelColor } from "../src/sim/terrain-core";

test("validate open-simplex tuned params (bias=2, scale=3)", () => {
  const cfg = getConfig();
  const prev = { ...cfg.terrain };
  updateConfig({ terrain: { noiseType: "open-simplex", surfaceBias: 2, quantizeScale: 3 } });

  const seeds = [1, 2, 3, 4, 5];
  let total = 0;
  let above = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of seeds) {
    const seed = getSeed(s);
    const voxels = generateInstances(seed, cfg.terrain.worldRadius);
    total += voxels.length;
    for (const v of voxels) {
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      const hexColor = getVoxelColor(v.y, cfg.terrain.waterLevel);
      if (hexColor === 0x59a848 || hexColor === 0x3b7032) above += 1;
    }

    // write one visual map for seed 1 only
    if (s === 1) {
      const size = 121;
      const half = Math.floor(size / 2);
      const outDir = path.resolve(process.cwd(), "verification");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const filename = path.join(outDir, `terrain-open-simplex-tuned-seed${seed}.ppm`);
      const header = `P3\n${size} ${size}\n255\n`;
      const pixels: string[] = [];

      for (let iz = -half; iz <= half; iz++) {
        for (let ix = -half; ix <= half; ix++) {
          const x = ix;
          const z = iz;
          const v = generateInstances(seed, 0).find((vv) => vv.x === x && vv.z === z);
          let y: number;
          if (v) y = v.y;
          else y = Math.floor((cfg.terrain.surfaceBias + 0) * cfg.terrain.quantizeScale); // fallback
          const hexColor = getVoxelColor(y, cfg.terrain.waterLevel);
          const r = (hexColor >> 16) & 0xff;
          const g = (hexColor >> 8) & 0xff;
          const b = hexColor & 0xff;
          pixels.push(`${r} ${g} ${b}`);
        }
      }

      fs.writeFileSync(filename, header + pixels.join("\n"));
      console.log(`Wrote tuned visual map to ${filename}`);
    }
  }

  const frac = above / total;
  console.log(
    `Tuned open-simplex combined grass fraction: ${(frac * 100).toFixed(2)}% minY=${minY} maxY=${maxY}`,
  );

  // Expect fraction within 3% absolute of previous sincos baseline (approx 16.9%)
  expect(frac).toBeGreaterThan(0.13); // >13%
  expect(frac).toBeLessThan(0.2); // <20%

  // restore
  updateConfig({ terrain: prev });
});
