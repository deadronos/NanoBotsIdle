/*
  Script: generate-baselines.js
  Reads verification/baselines/meta.json and writes PPM files for each entry.
  Usage: node scripts/generate-baselines.js
*/

import fs from "fs";
import path from "path";
import { getSeed } from "../src/sim/seed";
import { getConfig, updateConfig } from "../src/config/index";
import { getVoxelColor } from "../src/utils";
import { getSurfaceHeight } from "../src/sim/terrain";

const metaPath = path.resolve(process.cwd(), "verification/baselines/meta.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

const cfg = getConfig();
const prev = { ...cfg.terrain };

for (const entry of meta) {
  console.log(`Generating baseline: ${entry.file} (seed=${entry.seed}, size=${entry.size})`);
  updateConfig({ terrain: { noiseType: entry.noiseType, surfaceBias: entry.surfaceBias, quantizeScale: entry.quantizeScale } });

  const seed = getSeed(entry.seed);
  const size = entry.size;
  const half = Math.floor(size / 2);
  const header = `P3\n${size} ${size}\n255\n`;
  const pixels = [];

  for (let iz = -half; iz <= half; iz++) {
    for (let ix = -half; ix <= half; ix++) {
      const x = ix;
      const z = iz;
      const y = getSurfaceHeight(x, z, seed);
      const color = getVoxelColor(y, cfg.terrain.waterLevel).getHexString();
      const r = parseInt(color.slice(0, 2), 16);
      const g = parseInt(color.slice(2, 4), 16);
      const b = parseInt(color.slice(4, 6), 16);
      pixels.push(`${r} ${g} ${b}`);
    }
  }

  const outDir = path.resolve(process.cwd(), "verification/baselines");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filename = path.join(outDir, entry.file);
  fs.writeFileSync(filename, header + pixels.join("\n"), "utf8");
  console.log(`Wrote baseline: ${filename}`);
}

// restore
updateConfig({ terrain: prev });
console.log("Done generating baselines.");

// For convenience, expose a small helper to run baseline update via npm script
// Use: node scripts/generate-baselines.js (preferred) or npm run update:baselines (added below)
