import { makeNoise2D } from "open-simplex-noise";

export type NoiseProvider = {
  noise2D: (x: number, z: number) => number;
};

export const createNoiseProvider = (seed: number, type: "sincos" | "open-simplex" | string = "sincos"): NoiseProvider => {
  if (type === "open-simplex") {
    // open-simplex returns -1..1
    const noise2d = makeNoise2D(Number(seed || 0));
    return {
      noise2D: (x: number, z: number) => {
        // scale up to approximate prior amplitude (empirically ~5)
        return noise2d(x * 0.08, z * 0.08) * 5;
      },
    };
  }

  // default: sin/cos legacy provider (kept for parity/tuning)
  return {
    noise2D: (x: number, z: number) => {
      const n =
        Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) * 2 +
        Math.sin(x * 0.3 + seed * 2) * Math.cos(z * 0.3 - seed) * 1 +
        Math.sin(x * 0.05 - seed) * 2;
      return n;
    },
  };
};
