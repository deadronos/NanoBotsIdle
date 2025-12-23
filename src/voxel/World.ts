/* Voxel world + chunk storage + terrain generation. */
import { buildChunkGeometry, type BuiltGeometry, type MeshBuffers } from "./meshing";
import { PERF } from "../config/perf";
import { SeededRng } from "./generation/rng";
import { fbm2, fbm3, hash2 } from "./noise";
import { LightQueue, type LightLayer } from "./lighting";
import type { ToolType } from "./tools";

type BlockTile = {
  all?: number;
  top?: number;
  side?: number;
  bottom?: number;
};

export type DropEntry = {
  itemId: number | string;
  min: number;
  max: number;
  chance?: number;
};

export type BlockDef = {
  name: string;
  solid: boolean;
  tile: BlockTile;
  emitLight?: number;
  transparent?: boolean;
  occludes?: boolean;
  breakable?: boolean;
  hardness?: number;
  requiredToolType?: ToolType;
  requiredTier?: number;
  dropTable?: DropEntry[];
  renderFaces?: "all" | "top";
};

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
  CoalOre = 13,
  IronOre = 14,
  GoldOre = 15,
  DiamondOre = 16,
}

export const BLOCKS: BlockDef[] = [
  // index matches BlockId enum
  {
    name: "Air",
    solid: false,
    tile: { all: 0 },
    occludes: false,
    transparent: true,
    hardness: 0,
  },
  { name: "Grass", solid: true, tile: { top: 1, side: 2, bottom: 3 }, hardness: 0.9 },
  { name: "Dirt", solid: true, tile: { all: 3 }, hardness: 0.8 },
  {
    name: "Stone",
    solid: true,
    tile: { all: 4 },
    hardness: 3,
    requiredToolType: "pickaxe",
    requiredTier: 1,
  },
  {
    name: "Water",
    solid: false,
    tile: { all: 5 },
    transparent: true,
    occludes: false,
    hardness: 0,
    renderFaces: "top",
  },
  { name: "Sand", solid: true, tile: { all: 6 }, hardness: 0.7 },
  { name: "Wood", solid: true, tile: { side: 7, top: 8, bottom: 8 }, hardness: 1.8 },
  {
    name: "Leaves",
    solid: true,
    tile: { all: 9 },
    transparent: true,
    occludes: false,
    hardness: 0.4,
  },
  { name: "Planks", solid: true, tile: { all: 10 }, hardness: 1.5 },
  { name: "Brick", solid: true, tile: { all: 11 }, hardness: 3.2 },
  {
    name: "Glass",
    solid: true,
    tile: { all: 12 },
    transparent: true,
    occludes: false,
    hardness: 0.6,
  },
  {
    name: "Torch",
    solid: false,
    tile: { all: 13 },
    emitLight: 14,
    transparent: true,
    occludes: false,
    hardness: 0.2,
  },
  {
    name: "Bedrock",
    solid: true,
    tile: { all: 14 },
    breakable: false,
    hardness: Number.POSITIVE_INFINITY,
  },
  {
    name: "Coal Ore",
    solid: true,
    tile: { all: 15 },
    hardness: 3.2,
    requiredToolType: "pickaxe",
    requiredTier: 1,
    dropTable: [{ itemId: BlockId.CoalOre, min: 1, max: 1 }],
  },
  {
    name: "Iron Ore",
    solid: true,
    tile: { all: 16 },
    hardness: 3.6,
    requiredToolType: "pickaxe",
    requiredTier: 2,
    dropTable: [{ itemId: BlockId.IronOre, min: 1, max: 1 }],
  },
  {
    name: "Gold Ore",
    solid: true,
    tile: { all: 17 },
    hardness: 3.8,
    requiredToolType: "pickaxe",
    requiredTier: 2,
    dropTable: [{ itemId: BlockId.GoldOre, min: 1, max: 1 }],
  },
  {
    name: "Diamond Ore",
    solid: true,
    tile: { all: 18 },
    hardness: 4.2,
    requiredToolType: "pickaxe",
    requiredTier: 3,
    dropTable: [{ itemId: BlockId.DiamondOre, min: 1, max: 1 }],
  },
];

export type OreConfig = {
  id: BlockId;
  minY: number;
  maxY: number;
  attemptsPerChunk: number;
  veinSizeMin: number;
  veinSizeMax: number;
  replaceable?: BlockId[];
};

export type WorldGenerationConfig = {
  caves: {
    enabled: boolean;
    noiseScale: number;
    threshold: number;
    minY: number;
    maxY: number;
    protectSurface: boolean;
  };
  ores: OreConfig[];
};

export const DEFAULT_GENERATION_CONFIG: WorldGenerationConfig = {
  caves: {
    enabled: true,
    noiseScale: 0.08,
    threshold: 0.35,
    minY: 6,
    maxY: 56,
    protectSurface: true,
  },
  ores: [
    {
      id: BlockId.CoalOre,
      minY: 8,
      maxY: 60,
      attemptsPerChunk: 18,
      veinSizeMin: 3,
      veinSizeMax: 7,
    },
    {
      id: BlockId.IronOre,
      minY: 6,
      maxY: 48,
      attemptsPerChunk: 12,
      veinSizeMin: 3,
      veinSizeMax: 6,
    },
    {
      id: BlockId.GoldOre,
      minY: 5,
      maxY: 36,
      attemptsPerChunk: 8,
      veinSizeMin: 2,
      veinSizeMax: 5,
    },
    {
      id: BlockId.DiamondOre,
      minY: 4,
      maxY: 20,
      attemptsPerChunk: 4,
      veinSizeMin: 2,
      veinSizeMax: 4,
    },
  ],
};

export function blockIdToName(id: BlockId): string {
  return BLOCKS[id]?.name ?? "Unknown";
}

export const BLOCK_ID_LIST = BLOCKS.map((_, index) => index as BlockId);

export type ChunkSize = { x: number; y: number; z: number };

export type WorldOptions = {
  seed: number;
  viewDistanceChunks: number;
  chunkSize: ChunkSize;
  generation?: Partial<WorldGenerationConfig>;
  seaLevel?: number;
  perf?: {
    maxLightOpsPerFrame?: number;
    maxChunkRebuildsPerFrame?: number;
  };
};

export type ChunkKey = string; // "cx,cz"

type GenerationContext = {
  seed: number;
  options: WorldGenerationConfig;
  chunkPos: { cx: number; cz: number };
  chunkSize: ChunkSize;
  baseX: number;
  baseZ: number;
  heightMap: Int16Array;
  rng: SeededRng;
};

type NormalizedCavesConfig = WorldGenerationConfig["caves"] & {
  minY: number;
  maxY: number;
  noiseScale: number;
  threshold: number;
};

type NormalizedOreConfig = OreConfig & {
  minY: number;
  maxY: number;
  attemptsPerChunk: number;
  veinSizeMin: number;
  veinSizeMax: number;
  replaceable: BlockId[];
};

export class Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly size: ChunkSize;
  blocks: Uint8Array;
  sunLight: Uint8Array;
  blockLight: Uint8Array;
  built: BuiltGeometry | null = null;
  meshBuffers?: MeshBuffers;
  dirty = true;

  constructor(cx: number, cz: number, size: ChunkSize) {
    this.cx = cx;
    this.cz = cz;
    this.size = size;
    this.blocks = new Uint8Array(size.x * size.y * size.z);
    this.sunLight = new Uint8Array(size.x * size.y * size.z);
    this.blockLight = new Uint8Array(size.x * size.y * size.z);
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
  private generation: WorldGenerationConfig;
  private lightQueue = new LightQueue();
  private maxLightOpsPerFrame: number;
  private maxChunkRebuildsPerFrame: number;

  // Terrain knobs.
  private seaLevel: number;

  constructor(opts: WorldOptions) {
    this.seed = opts.seed;
    this.viewDistanceChunks = opts.viewDistanceChunks;
    this.chunkSize = opts.chunkSize;
    this.generation = resolveGenerationConfig(opts.generation);
    const seaLevel = opts.seaLevel ?? 18;
    this.seaLevel = Number.isFinite(seaLevel) ? Math.max(0, seaLevel) : 18;
    this.maxLightOpsPerFrame =
      opts.perf?.maxLightOpsPerFrame ?? PERF.maxLightOpsPerFrame;
    this.maxChunkRebuildsPerFrame =
      opts.perf?.maxChunkRebuildsPerFrame ?? PERF.maxChunkRebuildsPerFrame;
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
    this.initializeChunkLighting(c);
    this.queueBlockLightSourcesNearChunk(cx, cz);
    this.queueSunlightSourcesNearChunk(cx, cz);
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

  getLightAt(wx: number, wy: number, wz: number): number {
    const sun = this.getLightLayer("sun", wx, wy, wz);
    const block = this.getLightLayer("block", wx, wy, wz);
    return Math.max(sun, block);
  }

  getLight(layer: LightLayer, wx: number, wy: number, wz: number): number {
    return this.getLightLayer(layer, wx, wy, wz);
  }

  setLight(layer: LightLayer, wx: number, wy: number, wz: number, level: number): boolean {
    return this.setLightLayer(layer, wx, wy, wz, level);
  }

  isTransparent(wx: number, wy: number, wz: number): boolean {
    return this.isTransparentAt(wx, wy, wz);
  }

  processLightQueue(maxOps = this.maxLightOpsPerFrame): void {
    if (!this.lightQueue.hasPending()) return;
    this.lightQueue.process(this, maxOps, (x, y, z) => this.markDirtyAt(x, y, z));
  }

  rebuildDirtyChunks(): void {
    if (this.dirty.size === 0) return;

    // Limit rebuild work per frame to keep it smooth.
    const maxPerFrame = this.maxChunkRebuildsPerFrame;
    let done = 0;

    for (const k of this.dirty) {
      const c = this.chunks.get(k);
      if (!c) {
        this.dirty.delete(k);
        continue;
      }

      const built = buildChunkGeometry(this, c, c.meshBuffers);
      c.built = built;
      c.meshBuffers = built.buffers;
      c.dirty = false;
      this.dirty.delete(k);

      done++;
      if (done >= maxPerFrame) break;
    }
  }

  handleBlockChanged(wx: number, wy: number, wz: number, oldId: BlockId, newId: BlockId): void {
    if (oldId === newId) return;
    const oldDef = BLOCKS[oldId];
    const newDef = BLOCKS[newId];
    const oldOccludes = this.blockOccludes(oldId);
    const newOccludes = this.blockOccludes(newId);

    const oldEmit = oldDef?.emitLight ?? 0;
    const newEmit = newDef?.emitLight ?? 0;

    if (oldEmit > 0) {
      const prev = this.getLightLayer("block", wx, wy, wz);
      if (prev > 0) {
        if (this.setLightLayer("block", wx, wy, wz, 0)) {
          this.markDirtyAt(wx, wy, wz);
        }
        this.lightQueue.enqueueRemove("block", wx, wy, wz, prev);
      }
    }

    if (!oldOccludes && newOccludes) {
      const prev = this.getLightLayer("block", wx, wy, wz);
      if (prev > 0) {
        if (this.setLightLayer("block", wx, wy, wz, 0)) {
          this.markDirtyAt(wx, wy, wz);
        }
        this.lightQueue.enqueueRemove("block", wx, wy, wz, prev);
      }
    }

    if (oldOccludes && !newOccludes) {
      this.queueNeighborBlockLight(wx, wy, wz);
    }

    if (newEmit > 0) {
      if (this.setLightLayer("block", wx, wy, wz, newEmit)) {
        this.markDirtyAt(wx, wy, wz);
      }
      this.lightQueue.enqueueAdd("block", wx, wy, wz, newEmit);
    }

    if (oldOccludes !== newOccludes) {
      this.updateSunlightColumn(wx, wz);
    }
  }

  private initializeChunkLighting(chunk: Chunk): void {
    const { x: sx, y: sy, z: sz } = chunk.size;
    const stride = sx * sz;
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        let blocked = false;
        for (let y = sy - 1; y >= 0; y--) {
          const idx = x + sx * z + stride * y;
          const id = chunk.blocks[idx] as BlockId;
          const occludes = this.blockOccludes(id);
          if (occludes) {
            blocked = true;
            chunk.sunLight[idx] = 0;
            continue;
          }
          chunk.sunLight[idx] = blocked ? 0 : 15;
        }
      }
    }

    for (let y = 0; y < sy; y++) {
      for (let z = 0; z < sz; z++) {
        for (let x = 0; x < sx; x++) {
          const idx = x + sx * z + stride * y;
          const id = chunk.blocks[idx] as BlockId;
          const emit = BLOCKS[id]?.emitLight ?? 0;
          if (emit <= 0) continue;
          chunk.blockLight[idx] = emit;
        }
      }
    }
  }

  private updateSunlightColumn(wx: number, wz: number): void {
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const { x: sx, y: sy, z: sz } = chunk.size;
    if (lx < 0 || lx >= sx || lz < 0 || lz >= sz) return;

    const stride = sx * sz;
    let blocked = false;
    for (let y = sy - 1; y >= 0; y--) {
      const idx = lx + sx * lz + stride * y;
      const id = chunk.blocks[idx] as BlockId;
      const occludes = this.blockOccludes(id);
      if (occludes) {
        blocked = true;
      }
      const next = blocked || occludes ? 0 : 15;
      const prev = chunk.sunLight[idx];
      if (prev === next) continue;
      chunk.sunLight[idx] = next;
      this.markDirtyAt(wx, y, wz);
      if (next > prev) {
        this.lightQueue.enqueueAdd("sun", wx, y, wz, next);
      } else {
        this.lightQueue.enqueueRemove("sun", wx, y, wz, prev);
      }
    }
  }

  private queueNeighborBlockLight(wx: number, wy: number, wz: number): void {
    const neighbors: Array<readonly [number, number, number]> = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const [dx, dy, dz] of neighbors) {
      const nx = wx + dx;
      const ny = wy + dy;
      const nz = wz + dz;
      const level = this.getLightLayer("block", nx, ny, nz);
      if (level > 1) {
        this.lightQueue.enqueueAdd("block", nx, ny, nz, level);
      }
    }
  }

  private queueBlockLightSourcesNearChunk(cx: number, cz: number): void {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.getChunk(cx + dx, cz + dz);
        if (!chunk) continue;
        const { x: sx, y: sy, z: sz } = chunk.size;
        const stride = sx * sz;
        const baseX = chunk.cx * sx;
        const baseZ = chunk.cz * sz;
        for (let y = 0; y < sy; y++) {
          for (let z = 0; z < sz; z++) {
            for (let x = 0; x < sx; x++) {
              const idx = x + sx * z + stride * y;
              const id = chunk.blocks[idx] as BlockId;
              const emit = BLOCKS[id]?.emitLight ?? 0;
              if (emit <= 0) continue;
              this.lightQueue.enqueueAdd("block", baseX + x, y, baseZ + z, emit);
            }
          }
        }
      }
    }
  }

  private queueSunlightSourcesNearChunk(cx: number, cz: number): void {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.getChunk(cx + dx, cz + dz);
        if (!chunk) continue;
        const { x: sx, y: sy, z: sz } = chunk.size;
        const stride = sx * sz;
        const baseX = chunk.cx * sx;
        const baseZ = chunk.cz * sz;
        for (let y = 0; y < sy; y++) {
          for (let z = 0; z < sz; z++) {
            for (let x = 0; x < sx; x++) {
              const idx = x + sx * z + stride * y;
              if (chunk.sunLight[idx] !== 15) continue;
              this.lightQueue.enqueueAdd("sun", baseX + x, y, baseZ + z, 15);
            }
          }
        }
      }
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

  private getLightLayer(layer: LightLayer, wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= this.chunkSize.y) return 0;
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    const idx = chunk.idx(lx, wy, lz);
    return layer === "sun" ? chunk.sunLight[idx] : chunk.blockLight[idx];
  }

  private setLightLayer(layer: LightLayer, wx: number, wy: number, wz: number, level: number): boolean {
    if (wy < 0 || wy >= this.chunkSize.y) return false;
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;
    const idx = chunk.idx(lx, wy, lz);
    const target = layer === "sun" ? chunk.sunLight : chunk.blockLight;
    const prev = target[idx];
    if (prev === level) return false;
    target[idx] = level;
    return true;
  }

  private isTransparentAt(wx: number, wy: number, wz: number): boolean {
    if (wy < 0 || wy >= this.chunkSize.y) return false;
    const { cx, cz, lx, lz } = this.worldToChunk(wx, wz);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;
    const id = chunk.getLocal(lx, wy, lz);
    return !this.blockOccludes(id);
  }

  private blockOccludes(id: BlockId): boolean {
    const def = BLOCKS[id];
    return def ? (def.occludes ?? def.solid) : true;
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
    const ctx = this.createGenerationContext(c);
    this.applyHeightmap(ctx, c);
    this.applyCaves(ctx, c);
    this.applyOres(ctx, c);
    this.applyFeatures(ctx, c);
    c.dirty = true;
  }

  private createGenerationContext(c: Chunk): GenerationContext {
    const baseX = c.cx * c.size.x;
    const baseZ = c.cz * c.size.z;
    const rng = new SeededRng(this.seed).fork(`chunk:${c.cx},${c.cz}`);
    return {
      seed: this.seed,
      options: this.generation,
      chunkPos: { cx: c.cx, cz: c.cz },
      chunkSize: c.size,
      baseX,
      baseZ,
      heightMap: new Int16Array(c.size.x * c.size.z),
      rng,
    };
  }

  private applyHeightmap(ctx: GenerationContext, c: Chunk): void {
    const { x: sx, y: sy, z: sz } = c.size;
    const baseX = ctx.baseX;
    const baseZ = ctx.baseZ;
    const stride = sx * sz;
    const heightMap = ctx.heightMap;

    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const wx = baseX + x;
        const wz = baseZ + z;

        const n = fbm2((wx + this.seed) * 0.02, (wz - this.seed) * 0.02, 5);
        const hills = fbm2((wx - this.seed) * 0.006, (wz + this.seed) * 0.006, 3);

        let h = Math.floor(16 + n * 18 + hills * 26);
        h = Math.max(2, Math.min(sy - 2, h));

        heightMap[x + sx * z] = h;

        // Biome-ish: sandy beaches near sea.
        const nearSea = h <= this.seaLevel + 1;
        const column = x + sx * z;

        for (let y = 0; y < sy; y++) {
          const id = this.terrainBlockAt(y, h, nearSea);
          c.blocks[column + stride * y] = id;
        }
      }
    }
  }

  private applyCaves(ctx: GenerationContext, c: Chunk): void {
    const caves = normalizeCaveConfig(ctx.options.caves, c.size.y - 1);
    if (!caves.enabled) return;

    const { x: sx, y: sy, z: sz } = c.size;
    const baseX = ctx.baseX;
    const baseZ = ctx.baseZ;
    const stride = sx * sz;
    const heightMap = ctx.heightMap;
    const surfaceBuffer = caves.protectSurface ? 3 : 0;

    for (let y = caves.minY; y <= caves.maxY; y++) {
      for (let z = 0; z < sz; z++) {
        const wz = baseZ + z;
        for (let x = 0; x < sx; x++) {
          const hmIndex = x + sx * z;
          if (surfaceBuffer > 0 && y >= heightMap[hmIndex] - surfaceBuffer) continue;

          const idx = x + sx * z + stride * y;
          const existing = c.blocks[idx] as BlockId;
          if (existing === BlockId.Air || existing === BlockId.Bedrock) continue;

          const wx = baseX + x;
          const noise = fbm3(wx * caves.noiseScale, y * caves.noiseScale, wz * caves.noiseScale, 4, ctx.seed);
          if (noise > caves.threshold) {
            c.blocks[idx] = BlockId.Air;
          }
        }
      }
    }
  }

  private applyOres(ctx: GenerationContext, c: Chunk): void {
    if (!ctx.options.ores.length) return;

    const { x: sx, y: sy, z: sz } = c.size;
    const stride = sx * sz;

    for (const ore of ctx.options.ores) {
      const config = normalizeOreConfig(ore, sy - 1);
      if (config.attemptsPerChunk <= 0) continue;

      const replaceable = new Set(config.replaceable);
      const oreRng = ctx.rng.fork(`ore:${config.id}`);

      for (let attempt = 0; attempt < config.attemptsPerChunk; attempt++) {
        const attemptRng = oreRng.fork(attempt);
        let lx = attemptRng.int(0, sx - 1);
        let lz = attemptRng.int(0, sz - 1);
        let ly = attemptRng.int(config.minY, config.maxY);
        const veinSize = attemptRng.int(config.veinSizeMin, config.veinSizeMax);

        for (let step = 0; step < veinSize; step++) {
          if (ly < config.minY) ly = config.minY;
          if (ly > config.maxY) ly = config.maxY;

          if (lx >= 0 && lx < sx && lz >= 0 && lz < sz && ly >= 0 && ly < sy) {
            const idx = lx + sx * lz + stride * ly;
            const existing = c.blocks[idx] as BlockId;
            if (replaceable.has(existing)) {
              c.blocks[idx] = config.id;
            }
          }

          switch (attemptRng.int(0, 5)) {
            case 0:
              lx += 1;
              break;
            case 1:
              lx -= 1;
              break;
            case 2:
              ly += 1;
              break;
            case 3:
              ly -= 1;
              break;
            case 4:
              lz += 1;
              break;
            default:
              lz -= 1;
              break;
          }
        }
      }
    }
  }

  private applyFeatures(ctx: GenerationContext, c: Chunk): void {
    const { x: sx, z: sz } = c.size;
    const baseX = ctx.baseX;
    const baseZ = ctx.baseZ;
    const heightMap = ctx.heightMap;

    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const wx = baseX + x;
        const wz = baseZ + z;
        const h = heightMap[x + sx * z];

        const nearSea = h <= this.seaLevel + 1;
        const treeChance = nearSea ? 0.01 : 0.035;
        const r = hash2(wx, wz, this.seed);
        if (r < treeChance) {
          this.placeTree(c, x, h + 1, z, wx, wz);
        }
      }
    }
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

function resolveGenerationConfig(
  overrides?: Partial<WorldGenerationConfig>,
): WorldGenerationConfig {
  const caves = { ...DEFAULT_GENERATION_CONFIG.caves, ...overrides?.caves };
  const ores = overrides?.ores ?? DEFAULT_GENERATION_CONFIG.ores;
  return { caves, ores };
}

function normalizeCaveConfig(caves: WorldGenerationConfig["caves"], maxY: number): NormalizedCavesConfig {
  const minY = clampInt(caves.minY, 0, maxY);
  const maxYClamped = clampInt(caves.maxY, 0, maxY);
  const low = Math.min(minY, maxYClamped);
  const high = Math.max(minY, maxYClamped);

  return {
    ...caves,
    minY: low,
    maxY: high,
    noiseScale: Math.max(0.0001, caves.noiseScale),
    threshold: clampFloat(caves.threshold, -1, 1),
  };
}

function normalizeOreConfig(ore: OreConfig, maxY: number): NormalizedOreConfig {
  const minY = clampInt(ore.minY, 0, maxY);
  const maxYClamped = clampInt(ore.maxY, 0, maxY);
  const low = Math.min(minY, maxYClamped);
  const high = Math.max(minY, maxYClamped);
  const attempts = Math.max(0, Math.floor(ore.attemptsPerChunk));
  const veinMin = Math.max(1, Math.floor(ore.veinSizeMin));
  const veinMax = Math.max(veinMin, Math.floor(ore.veinSizeMax));
  const replaceable =
    ore.replaceable && ore.replaceable.length > 0 ? ore.replaceable : [BlockId.Stone];

  return {
    ...ore,
    minY: low,
    maxY: high,
    attemptsPerChunk: attempts,
    veinSizeMin: veinMin,
    veinSizeMax: veinMax,
    replaceable,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
