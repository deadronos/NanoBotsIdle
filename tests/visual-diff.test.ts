import fs from "fs";
import path from "path";
import { expect, test } from "vitest";

import { getConfig, updateConfig } from "../src/config/index";
import { getSeed } from "../src/sim/seed";
import { getSurfaceHeight } from "../src/sim/terrain";
import { getVoxelColor } from "../src/sim/terrain-core";

const parsePPMPixels = (content: string) => {
  const lines = content.split(/\r?\n/).slice(3); // skip header
  const pixels: [number, number, number][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line
      .trim()
      .split(/\s+/)
      .map((s) => parseInt(s, 10));
    // Parts are triples; sometimes grouped per line
    for (let i = 0; i < parts.length; i += 3) {
      pixels.push([parts[i], parts[i + 1], parts[i + 2]]);
    }
  }
  return pixels;
};

const generatePPM = (seedNum: number, cfg: ReturnType<typeof getConfig>) => {
  const seed = getSeed(seedNum);
  const size = 121;
  const half = Math.floor(size / 2);
  const header = `P3\n${size} ${size}\n255\n`;
  const pixels: string[] = [];

  for (let iz = -half; iz <= half; iz++) {
    for (let ix = -half; ix <= half; ix++) {
      const x = ix;
      const z = iz;
      const y = getSurfaceHeight(x, z, seed);
      const hexColor = getVoxelColor(y, cfg.terrain.waterLevel);
      const r = (hexColor >> 16) & 0xff;
      const g = (hexColor >> 8) & 0xff;
      const b = hexColor & 0xff;
      pixels.push(`${r} ${g} ${b}`);
    }
  }

  return header + pixels.join("\n");
};

test("visual diff against baseline is below threshold", () => {
  const cfg = getConfig();
  const prev = { ...cfg.terrain };

  updateConfig({ terrain: { noiseType: "open-simplex", surfaceBias: 2, quantizeScale: 3 } });

  const seed = 222;
  generatePPM(seed, cfg);

  const metaPath = path.resolve(process.cwd(), "verification/baselines/meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

  for (const entry of meta) {
    const baselinePath = path.resolve(process.cwd(), `verification/baselines/${entry.file}`);
    console.log(`Comparing ${entry.file} (seed ${entry.seed})`);

    // Support a one-time baseline update mode: set UPDATE_BASELINE=1 to overwrite the baseline
    if (process.env.UPDATE_BASELINE === "1") {
      fs.writeFileSync(baselinePath, generatePPM(entry.seed, cfg), "utf8");
      console.log(`Baseline updated at ${baselinePath}`);
      continue;
    }

    expect(fs.existsSync(baselinePath)).toBe(true);
    const baseline = fs.readFileSync(baselinePath, "utf8");

    const outForEntry = generatePPM(entry.seed, cfg);
    const pA = parsePPMPixels(outForEntry);
    const pB = parsePPMPixels(baseline);
    expect(pA.length).toBe(pB.length);

    let diffCount = 0;
    for (let i = 0; i < pA.length; i++) {
      const [ar, ag, ab] = pA[i];
      const [br, bg, bb] = pB[i];
      if (ar !== br || ag !== bg || ab !== bb) {
        diffCount += 1;
      }
    }

    const pct = diffCount / pA.length;
    console.log(
      `${entry.file} visual diff: ${diffCount} pixels (${(pct * 100).toFixed(4)}%) threshold=${entry.threshold}`,
    );

    expect(pct).toBeLessThan(entry.threshold);
  }

  // restore
  updateConfig({ terrain: prev });
});
