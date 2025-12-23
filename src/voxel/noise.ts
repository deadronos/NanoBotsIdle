/**
 * Tiny deterministic value noise / fBm utilities.
 * (Not high-quality Perlin/Simplex, but good enough for terrain.)
 */
export function hash2(x: number, z: number, seed: number): number {
  // 2D integer hash -> [0,1)
  let n = (x | 0) * 374761393 + (z | 0) * 668265263 + (seed | 0) * 2147483647;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967296;
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  // 3D integer hash -> [0,1)
  let n =
    (x | 0) * 374761393 +
    (y | 0) * 668265263 +
    (z | 0) * 2147483647 +
    (seed | 0) * 1597334677;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967296;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;

  const u = smoothstep(xf);
  const v = smoothstep(zf);

  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);

  const ab = lerp(a, b, u);
  const cd = lerp(c, d, u);
  return lerp(ab, cd, v) * 2 - 1; // [-1,1]
}

export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const w = smoothstep(zf);

  const a = hash3(xi, yi, zi, seed);
  const b = hash3(xi + 1, yi, zi, seed);
  const c = hash3(xi, yi + 1, zi, seed);
  const d = hash3(xi + 1, yi + 1, zi, seed);
  const e = hash3(xi, yi, zi + 1, seed);
  const f = hash3(xi + 1, yi, zi + 1, seed);
  const g = hash3(xi, yi + 1, zi + 1, seed);
  const h = hash3(xi + 1, yi + 1, zi + 1, seed);

  const ab = lerp(a, b, u);
  const cd = lerp(c, d, u);
  const ef = lerp(e, f, u);
  const gh = lerp(g, h, u);

  const abcd = lerp(ab, cd, v);
  const efgh = lerp(ef, gh, v);

  return lerp(abcd, efgh, w) * 2 - 1; // [-1,1]
}

export function fbm2(x: number, z: number, octaves: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2(x * freq, z * freq, 12345 + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / Math.max(1e-6, norm);
}

export function fbm3(
  x: number,
  y: number,
  z: number,
  octaves: number,
  seed = 12345,
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3(x * freq, y * freq, z * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / Math.max(1e-6, norm);
}
