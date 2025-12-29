export type RngSalt = number | string;

export class SeededRng {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed || 0x12345678;
  }

  nextUint(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  float(): number {
    return this.nextUint() / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }

  int(min: number, max: number): number {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(this.float() * (hi - lo + 1));
  }

  fork(salt: RngSalt): SeededRng {
    return new SeededRng(hashSeed(this.seed, salt));
  }
}

function hashSeed(seed: number, salt: RngSalt): number {
  const saltValue = typeof salt === "string" ? hashString(salt) : salt >>> 0;
  return mix32((seed >>> 0) ^ saltValue);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mix32(value: number): number {
  let n = value >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  n ^= n >>> 16;
  return n >>> 0;
}
