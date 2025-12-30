import { test, expect } from "vitest";
import { getSeed } from "../src/sim/seed";
import { getConfig, updateConfig } from "../src/config/index";
import { generateInstances } from "../src/sim/terrain";
import { getVoxelColor } from "../src/utils";

const seeds = Array.from({ length: 10 }, (_, i) => i + 1);

const computeAboveWaterFraction = (noiseType: string, surfaceBias: number, quantizeScale: number) => {
  const cfg = getConfig();
  const prev = { ...cfg.terrain };
  updateConfig({ terrain: { noiseType: noiseType as any, surfaceBias, quantizeScale } });

  let totalVoxels = 0;
  let totalAbove = 0;

  for (const s of seeds) {
    const seed = getSeed(s);
    const voxels = generateInstances(seed, cfg.terrain.worldRadius);
    totalVoxels += voxels.length;
    for (const v of voxels) {
      const hex = getVoxelColor(v.y, cfg.terrain.waterLevel).getHexString();
      if (hex === "59a848" || hex === "3b7032") totalAbove += 1;
    }
  }

  // restore
  updateConfig({ terrain: prev });
  return totalAbove / totalVoxels;
};

test("tune open-simplex to match sincos above-water fraction", () => {
  const cfg = getConfig();
  const baseline = computeAboveWaterFraction("sincos", cfg.terrain.surfaceBias, cfg.terrain.quantizeScale);
  console.log(`baseline sincos above-water fraction: ${(baseline * 100).toFixed(2)}%`);

  const biases = [1.0, 1.5, 2.0, 2.5, 3.0];
  const scales = [3, 4, 5, 6];
  let best: { bias: number; scale: number; diff: number; frac: number } | null = null;

  for (const b of biases) {
    for (const s of scales) {
      const frac = computeAboveWaterFraction("open-simplex", b, s);
      const diff = Math.abs(frac - baseline);
      console.log(`open-simplex bias=${b}, scale=${s} => ${(frac * 100).toFixed(2)}% (diff ${(diff * 100).toFixed(2)}%)`);
      if (!best || diff < best.diff) {
        best = { bias: b, scale: s, diff, frac };
      }
    }
  }

  console.log(`best candidate: bias=${best!.bias}, scale=${best!.scale}, frac=${(best!.frac * 100).toFixed(2)}% (diff ${(best!.diff * 100).toFixed(2)}%)`);

  // Assert we found a candidate within 4% absolute difference
  expect(best!.diff).toBeLessThan(0.04);
});
