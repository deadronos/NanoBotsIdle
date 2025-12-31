import { makeNoise2D } from "open-simplex-noise";

export type BiomeId =
  | "ocean"
  | "beach"
  | "grassland"
  | "forest"
  | "desert"
  | "tundra"
  | "mountain"
  | "snow";

export type BiomeSample = {
  id: BiomeId;
  heat01: number;
  moisture01: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Noise2D = (x: number, z: number) => number;
const biomeNoiseCache = new Map<number, { heat: Noise2D; moisture: Noise2D }>();

const getBiomeNoises = (seed: number) => {
  const key = Number(seed || 0);
  const cached = biomeNoiseCache.get(key);
  if (cached) return cached;

  // Use distinct offsets so temperature/moisture are correlated but not identical.
  // open-simplex returns [-1, 1].
  const heat = makeNoise2D(key + 1337);
  const moisture = makeNoise2D(key + 7331);
  const out = { heat, moisture };
  biomeNoiseCache.set(key, out);
  return out;
};

const norm01 = (n: number) => clamp01((n + 1) * 0.5);

export const getBiomeAt = (
  x: number,
  z: number,
  seed: number,
  surfaceY: number,
  waterLevel: number,
): BiomeSample => {
  // Region-scale noise: low frequency, intended to vary over tens of blocks.
  const { heat, moisture } = getBiomeNoises(seed);
  const heat01 = norm01(heat(x * 0.02, z * 0.02));
  const moisture01 = norm01(moisture(x * 0.02, z * 0.02));

  // Hard rules first (height/water bands), then climate rules.
  let id: BiomeId;
  if (surfaceY <= waterLevel) id = "ocean";
  else if (surfaceY <= waterLevel + 2) id = "beach";
  else if (surfaceY >= waterLevel + 28) id = "snow";
  else if (surfaceY >= waterLevel + 20) id = "mountain";
  else if (heat01 < 0.25) id = moisture01 > 0.55 ? "tundra" : "tundra";
  else if (heat01 > 0.72 && moisture01 < 0.35) id = "desert";
  else if (moisture01 > 0.62) id = "forest";
  else id = "grassland";

  return { id, heat01, moisture01 };
};

/**
 * Returns biome color as a hex number (no Color allocation).
 * To be used with Color.setHex() or similar methods.
 */
export const getBiomeColor = (biome: BiomeSample): number => {
  switch (biome.id) {
    case "ocean":
      return 0x2d73bf;
    case "beach":
      return 0xe3dba3;
    case "grassland":
      return 0x59a848;
    case "forest":
      return 0x2e5f2a;
    case "desert":
      return 0xd7c27a;
    case "tundra":
      return 0xa7c2b8;
    case "mountain":
      return 0x6e6e6e;
    case "snow":
      return 0xffffff;
  }
};
