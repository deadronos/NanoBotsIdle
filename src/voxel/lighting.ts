export type LightLayer = "sun" | "block";

export type LightUpdate = {
  layer: LightLayer;
  type: "add" | "remove";
  x: number;
  y: number;
  z: number;
  level: number;
};

export type LightStorage = {
  getLight(layer: LightLayer, x: number, y: number, z: number): number;
  setLight(layer: LightLayer, x: number, y: number, z: number, level: number): boolean;
  isTransparent(x: number, y: number, z: number): boolean;
};

const NEIGHBORS: ReadonlyArray<Readonly<[number, number, number]>> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export class LightQueue {
  private addQueue: LightUpdate[] = [];
  private removeQueue: LightUpdate[] = [];
  private addIndex = 0;
  private removeIndex = 0;

  enqueueAdd(layer: LightLayer, x: number, y: number, z: number, level: number): void {
    if (level <= 0) return;
    this.addQueue.push({ layer, type: "add", x, y, z, level });
  }

  enqueueRemove(layer: LightLayer, x: number, y: number, z: number, level: number): void {
    if (level <= 0) return;
    this.removeQueue.push({ layer, type: "remove", x, y, z, level });
  }

  process(
    storage: LightStorage,
    maxOps: number,
    onChange?: (x: number, y: number, z: number) => void,
  ): number {
    let ops = 0;

    while (ops < maxOps) {
      let update: LightUpdate | undefined;
      let isRemove = false;

      if (this.removeIndex < this.removeQueue.length) {
        update = this.removeQueue[this.removeIndex++];
        isRemove = true;
      } else if (this.addIndex < this.addQueue.length) {
        update = this.addQueue[this.addIndex++];
      } else {
        break;
      }

      ops += 1;

      if (!update) continue;
      if (isRemove) {
        this.processRemove(storage, update, onChange);
      } else {
        this.processAdd(storage, update, onChange);
      }
    }

    this.compactQueues();
    return ops;
  }

  hasPending(): boolean {
    return this.addIndex < this.addQueue.length || this.removeIndex < this.removeQueue.length;
  }

  clear(): void {
    this.addQueue = [];
    this.removeQueue = [];
    this.addIndex = 0;
    this.removeIndex = 0;
  }

  private processAdd(
    storage: LightStorage,
    update: LightUpdate,
    onChange?: (x: number, y: number, z: number) => void,
  ): void {
    if (!storage.isTransparent(update.x, update.y, update.z)) return;

    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = update.x + dx;
      const ny = update.y + dy;
      const nz = update.z + dz;

      if (!storage.isTransparent(nx, ny, nz)) continue;
      const neighborLevel = storage.getLight(update.layer, nx, ny, nz);
      const nextLevel = update.level - 1;
      if (nextLevel <= 0 || nextLevel <= neighborLevel) continue;

      if (storage.setLight(update.layer, nx, ny, nz, nextLevel)) {
        onChange?.(nx, ny, nz);
      }
      this.enqueueAdd(update.layer, nx, ny, nz, nextLevel);
    }
  }

  private processRemove(
    storage: LightStorage,
    update: LightUpdate,
    onChange?: (x: number, y: number, z: number) => void,
  ): void {
    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = update.x + dx;
      const ny = update.y + dy;
      const nz = update.z + dz;

      if (!storage.isTransparent(nx, ny, nz)) continue;
      const neighborLevel = storage.getLight(update.layer, nx, ny, nz);
      if (neighborLevel <= 0) continue;

      if (neighborLevel < update.level) {
        if (storage.setLight(update.layer, nx, ny, nz, 0)) {
          onChange?.(nx, ny, nz);
        }
        this.enqueueRemove(update.layer, nx, ny, nz, neighborLevel);
      } else {
        this.enqueueAdd(update.layer, nx, ny, nz, neighborLevel);
      }
    }
  }

  private compactQueues(): void {
    if (this.addIndex > 1024) {
      this.addQueue = this.addQueue.slice(this.addIndex);
      this.addIndex = 0;
    }
    if (this.removeIndex > 1024) {
      this.removeQueue = this.removeQueue.slice(this.removeIndex);
      this.removeIndex = 0;
    }
  }
}
