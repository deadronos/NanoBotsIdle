/* Voxel world + chunk storage + terrain generation. */
import { buildChunkGeometry, type BuiltGeometry } from "./meshing";
import { fbm2, hash2 } from "./noise";

type BlockTile = {
  all?: number;
  top?: number;
  side?: number;
  bottom?: number;
};

export type BlockDef = {
  name: string;
  solid: boolean;
  tile: BlockTile;
  transparent?: boolean;
  occludes?: boolean;
  breakable?: boolean;
};

export const BLOCKS: BlockDef[] = [
  // index matches BlockId enum
  { name: "Air", solid: false, tile: { all: 0 }, occludes: false, transparent: true },
  { name: "Grass", solid: true, tile: { top: 1, side: 2, bottom: 3 } },
  { name: "Dirt", solid: true, tile: { all: 3 } },
  { name: "Stone", solid: true, tile: { all: 4 } },
  { name: "Water", solid: false, tile: { all: 5 }, transparent: true, occludes: false },
  { name: "Sand", solid: true, tile: { all: 6 } },
  { name: "Wood", solid: true, tile: { side: 7, top: 8, bottom: 8 } },
  { name: "Leaves", solid: true, tile: { all: 9 }, transparent: true, occludes: false },
  { name: "Planks", solid: true, tile: { all: 10 } },
  { name: "Brick", solid: true, tile: { all: 11 } },
  { name: "Glass", solid: true, tile: { all: 12 }, transparent: true, occludes: false },
  { name: "Torch", solid: false, tile: { all: 13 }, transparent: true, occludes: false },
  { name: "Bedrock", solid: true, tile: { all: 14 }, breakable: false },
];

export enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Water = 4,
  Sand = 5,
  Wood = 6,
  Leaves = 7,
  Planks = 8,
  Brick = 9,
  Glass = 10,
  Torch = 11,
  Bedrock = 12,
}

export function blockIdToName(id: BlockId): string {
  return BLOCKS[id]?.name ?? "Unknown";
}

export const BLOCK_ID_LIST = BLOCKS.map((_, index) => index as BlockId);

export type ChunkSize = { x: number; y: number; z: number };

export type WorldOptions = {
  seed: number;
  viewDistanceChunks: number;
  chunkSize: ChunkSize;
};

export type ChunkKey = string; // "cx,cz"

export class Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly size: ChunkSize;
  blocks: Uint8Array;
  built: BuiltGeometry | null = null;
  dirty = true;

  constructor(cx: number, cz: number, size: ChunkSize) {
    this.cx = cx;
    this.cz = cz;
    this.size = size;
    this.blocks = new Uint8Array(size.x * size.y * size.z);
  }

  idx(x: number, y: number, z: number): number {
    const { x: sx, z: sz } = this.size;
    return x + sx * (z + sz * y); // x-major, then z, then y
  }

  getLocal(x: number, y: number, z: number): BlockId {
    if (x < 0 || y < 0 || z < 0) return BlockId.Air;
    if (x >= this.size.x || y >= this.size.y || z >= this.size.z) return BlockId.Air;
    return this.blocks[this.idx(x, y, z)] as BlockId;
  }

  setLocal(x: number, y: number, z: number, id: BlockId): void {
    if (x < 0 || y < 0 || z < 0) return;
    if (x >= this.size.x || y >= this.size.y || z >= this.size.z) return;
    this.blocks[this.idx(x, y, z)] = id;
    this.dirty = true;
  }
}

export class World {
  readonly seed: number;
  readonly viewDistanceChunks: number;
  readonly chunkSize: ChunkSize;

  private chunks = new Map<ChunkKey, Chunk>();
  private dirty = new Set<ChunkKey>();

  // Terrain knobs.
  private seaLevel = 18;

  constructor(opts: WorldOptions) {
    this.seed = opts.seed;
    this.viewDistanceChunks = opts.viewDistanceChunks;
    this.chunkSize = opts.chunkSize;
  }

  key(cx: number, cz: number): ChunkKey {
    return `${cx},${cz}`;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.key(cx, cz));
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const k = this.key(cx, cz);
    const existing = this.chunks.get(k);
    if (existing) return existing;

    const c = new Chunk(cx, cz, this.chunkSize);
    this.generateTerrainInto(c);
    this.chunks.set(k, c);
    this.dirty.add(k);
    // When a new chunk appears, its neighbors may need rebuild to hide/show border faces.
    this.dirty.add(this.key(cx - 1, cz));
    this.dirty.add(this.key(cx + 1, cz));
    this.dirty.add(this.key(cx, cz - 1));
    this.dirty.add(this.key(cx, cz + 1));
    return c;
  }

  generateInitialArea(centerCx: number, centerCz: number): void {
    const r = this.viewDistanceChunks;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        this.ensureChunk(centerCx + dx, centerCz + dz);
      }
    }
  }

  ensureChunksAround(wx: number, wz: number): void {
    const cx = Math.floor(wx / this.chunkSize.x);
    const cz = Math.floor(wz / this.chunkSize.z);
    const r = this.viewDistanceChunks;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        this.ensureChunk(cx + dx, cz + dz);
      }
    }
  }

  hasChunkKey(k: ChunkKey): boolean {
    return this.chunks.has(k);
  }

  /**
   * Keep memory bounded by unloading chunks far away.
   * Uses Chebyshev distance in chunk space.
   */
  pruneFarChunks(wx: number, wz: number): void {
    const cx = Math.floor(wx / this.chunkSize.x);
    const cz = Math.floor(wz / this.chunkSize.z);

    // Keep a slightly larger radius than viewDistance so borders don't thrash.
    const keep = this.viewDistanceChunks + 2;

    for (const [k, c] of this.chunks) {
      const dx = Math.abs(c.cx - cx);
      const dz = Math.abs(c.cz - cz);
      if (dx <= keep && dz <= keep) continue;

      // Drop from world. Rendering layer will dispose meshes on next sync.
      this.chunks.delete(k);
      this.dirty.delete(k);

      // Release CPU references to geometry (GPU resource disposal happens in renderer on mesh removal).
      c.built = null;
    }
  }

  getBlock(wx: number, wy: number, wz: number): BlockId {
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const c = this.getChunk(cx, cz);
    if (!c) return BlockId.Air;
    return c.getLocal(lx, wy, lz);
  }

  setBlock(wx: number, wy: number, wz: number, id: BlockId): void {
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const c = this.ensureChunk(cx, cz);
    c.setLocal(lx, wy, lz, id);
  }

  markDirtyAt(wx: number, wy: number, wz: number): void {
    // Rebuild affected chunk + any neighbors if the modified block is on an edge.
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    this.dirty.add(this.key(cx, cz));

    const edgeX0 = lx === 0;
    const edgeX1 = lx === this.chunkSize.x - 1;
    const edgeZ0 = lz === 0;
    const edgeZ1 = lz === this.chunkSize.z - 1;

    if (edgeX0) this.dirty.add(this.key(cx - 1, cz));
    if (edgeX1) this.dirty.add(this.key(cx + 1, cz));
    if (edgeZ0) this.dirty.add(this.key(cx, cz - 1));
    if (edgeZ1) this.dirty.add(this.key(cx, cz + 1));
  }

  rebuildDirtyChunks(): void {
    if (this.dirty.size === 0) return;

    // Limit rebuild work per frame to keep it smooth.
    const maxPerFrame = 4;
    let done = 0;

    for (const k of this.dirty) {
      const c = this.chunks.get(k);
      if (!c) {
        this.dirty.delete(k);
        continue;
      }

      c.built = buildChunkGeometry(this, c);
      c.dirty = false;
      this.dirty.delete(k);

      done++;
      if (done >= maxPerFrame) break;
    }
  }

  getChunkKeys(): IterableIterator<ChunkKey> {
    return this.chunks.keys();
  }

  getChunkByKey(k: ChunkKey): Chunk | undefined {
    return this.chunks.get(k);
  }

  getChunkCount(): number {
    return this.chunks.size;
  }

  worldToChunk(wx: number, wz: number): { cx: number; cz: number; lx: number; lz: number } {
    const cx = Math.floor(wx / this.chunkSize.x);
    const cz = Math.floor(wz / this.chunkSize.z);

    const lx = ((wx % this.chunkSize.x) + this.chunkSize.x) % this.chunkSize.x;
    const lz = ((wz % this.chunkSize.z) + this.chunkSize.z) % this.chunkSize.z;

    return { cx, cz, lx, lz };
  }

  chunkToWorld(cx: number, cz: number, lx: number, lz: number): { wx: number; wz: number } {
    return {
      wx: cx * this.chunkSize.x + lx,
      wz: cz * this.chunkSize.z + lz,
    };
  }

  private generateTerrainInto(c: Chunk): void {
    const { x: sx, y: sy, z: sz } = c.size;
    const baseX = c.cx * sx;
    const baseZ = c.cz * sz;

    // Height map using fbm noise.
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const wx = baseX + x;
        const wz = baseZ + z;

        const n = fbm2((wx + this.seed) * 0.02, (wz - this.seed) * 0.02, 5);
        const hills = fbm2((wx - this.seed) * 0.006, (wz + this.seed) * 0.006, 3);

        let h = Math.floor(16 + n * 18 + hills * 26);
        h = Math.max(2, Math.min(sy - 2, h));

        // Biome-ish: sandy beaches near sea.
        const nearSea = h <= this.seaLevel + 1;

        for (let y = 0; y < sy; y++) {
          const id = this.terrainBlockAt(y, h, nearSea);
          c.blocks[c.idx(x, y, z)] = id;
        }

        // Add a few trees occasionally.
        const treeChance = nearSea ? 0.01 : 0.035;
        const r = hash2(wx, wz, this.seed);
        if (r < treeChance) {
          this.placeTree(c, x, h + 1, z, wx, wz);
        }
      }
    }

    c.dirty = true;
  }

  private terrainBlockAt(y: number, height: number, nearSea: boolean): BlockId {
    if (y === 0) return BlockId.Bedrock;
    if (y > height) {
      if (y <= this.seaLevel) return BlockId.Water;
      return BlockId.Air;
    }
    if (y === height) {
      if (nearSea) return BlockId.Sand;
      return BlockId.Grass;
    }
    if (y >= height - 3) return nearSea ? BlockId.Sand : BlockId.Dirt;
    return BlockId.Stone;
  }

  private placeTree(c: Chunk, lx: number, y: number, lz: number, wx: number, wz: number): void {
    const sy = c.size.y;
    if (y <= 0 || y >= sy - 8) return;

    // Avoid trees underwater.
    if (y <= this.seaLevel + 1) return;

    const trunkH = (4 + hash2(wx + 99, wz - 17, this.seed) * 3) | 0;

    // Trunk
    for (let i = 0; i < trunkH; i++) {
      const ty = y + i;
      if (ty >= sy) break;
      c.setLocal(lx, ty, lz, BlockId.Wood);
    }

    // Leaves blob.
    const top = y + trunkH;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (dist > 4) continue;
          const px = lx + dx;
          const py = top + dy;
          const pz = lz + dz;
          if (py < 0 || py >= sy) continue;
          // Only place within this chunk. (Edges will look clipped - fine for starter.)
          if (px < 0 || pz < 0 || px >= c.size.x || pz >= c.size.z) continue;
          const existing = c.getLocal(px, py, pz);
          if (existing === BlockId.Air) c.setLocal(px, py, pz, BlockId.Leaves);
        }
      }
    }
  }
}
