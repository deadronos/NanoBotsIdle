import type { GameState } from "./types";
import {
  createSaveBlob,
  deserializeGameState,
  serializeGameState,
} from "./persistence";
import { CURRENT_SCHEMA_VERSION } from "./migrations";
import { useGameStore } from "./store";
import { stopSimulation, startSimulation } from "../sim/simLoop";
import pako from "pako";

const META_KEY = "nanofactory-save-meta";
const RUN_KEY = "nanofactory-save-run";

export interface StoredSection<T> {
  version: number;
  timestamp: number;
  data: T;
}

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn("Failed to write to localStorage:", e);
    return false;
  }
};

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Failed to read from localStorage:", e);
    return null;
  }
};

export const saveAll = (state: GameState): boolean => {
  const blobStr = serializeGameState(state);
  try {
    const blob = JSON.parse(blobStr) as unknown as Record<string, unknown>;
    // split meta and run
    const meta = { version: blob.version ?? CURRENT_SCHEMA_VERSION, timestamp: Date.now(), data: blob.meta };
    const run = { version: blob.version ?? CURRENT_SCHEMA_VERSION, timestamp: Date.now(), data: blob.run };

    const ok1 = safeSet(META_KEY, JSON.stringify(meta));
    const ok2 = safeSet(RUN_KEY, JSON.stringify(run));
    return ok1 && ok2;
  } catch (e) {
    console.error("Failed to serialize save blob:", e);
    return false;
  }
};

export const exportSave = (): string | null => {
  // combine current stored sections into a single JSON string for export
  const metaRaw = safeGet(META_KEY);
  const runRaw = safeGet(RUN_KEY);
  if (!metaRaw && !runRaw) return null;
  try {
    const metaObj = metaRaw ? JSON.parse(metaRaw) as StoredSection<Record<string, unknown>> : null;
    const runObj = runRaw ? JSON.parse(runRaw) as StoredSection<Record<string, unknown>> : null;
    const exportBlob = {
      version: metaObj?.version ?? runObj?.version ?? CURRENT_SCHEMA_VERSION,
      timestamp: Date.now(),
      meta: metaObj?.data ?? {},
      run: runObj?.data ?? {},
    };
    return JSON.stringify(exportBlob);
  } catch (e) {
    console.error("Failed to prepare export:", e);
    return null;
  }
};

export const importSave = (payload: string): boolean => {
  try {
    const parsed = JSON.parse(payload) as unknown as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return false;
    const version = Number(parsed.version) || CURRENT_SCHEMA_VERSION;
    const meta = { version, timestamp: Date.now(), data: parsed.meta ?? {} };
    const run = { version, timestamp: Date.now(), data: parsed.run ?? {} };
    const ok1 = safeSet(META_KEY, JSON.stringify(meta));
    const ok2 = safeSet(RUN_KEY, JSON.stringify(run));
    // verify migration is possible
    const migrated = deserializeGameState({ version, meta: meta.data, run: run.data });
    return !!(ok1 && ok2 && migrated.version);
  } catch (e) {
    console.error("Failed to import save:", e);
    return false;
  }
};

const uint8ToBase64 = (u8: Uint8Array) => {
  let chunkSize = 0x8000;
  let index = 0;
  const length = u8.length;
  let result = "";
  while (index < length) {
    const slice = u8.subarray(index, Math.min(index + chunkSize, length));
    result += String.fromCharCode.apply(null, Array.from(slice));
    index += chunkSize;
  }
  return btoa(result);
};

const base64ToUint8 = (b64: string) => {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const exportCompressedSave = (): string | null => {
  const raw = exportSave();
  if (!raw) return null;
  try {
    const compressed = pako.gzip(raw);
    const b64 = uint8ToBase64(compressed);
    return b64;
  } catch (e) {
    console.error("Failed to compress export:", e);
    return null;
  }
};

export const importCompressedSave = (payloadBase64: string): boolean => {
  try {
    const bytes = base64ToUint8(payloadBase64);
    const decompressed = pako.ungzip(bytes, { to: "string" });
    return importSave(decompressed as string);
  } catch (e) {
    console.error("Failed to import compressed save:", e);
    return false;
  }
};

export const loadAll = (): null | { meta: Record<string, unknown>; run: Record<string, unknown>; version: number } => {
  const metaRaw = safeGet(META_KEY);
  const runRaw = safeGet(RUN_KEY);
  if (!metaRaw && !runRaw) return null;

  try {
    const metaObj = metaRaw ? JSON.parse(metaRaw) as StoredSection<Record<string, unknown>> : null;
    const runObj = runRaw ? JSON.parse(runRaw) as StoredSection<Record<string, unknown>> : null;

    // Reconstruct a save blob for migration
    const version = metaObj?.version ?? runObj?.version ?? CURRENT_SCHEMA_VERSION;
    const blob = {
      version,
      meta: metaObj?.data ?? {},
      run: runObj?.data ?? {},
    } as const;

    const migrated = deserializeGameState(blob);
    return { meta: migrated.meta, run: migrated.run, version: migrated.version };
  } catch (e) {
    console.error("Failed to parse saved sections:", e);
    return null;
  }
};

export const clearSaves = (): void => {
  try {
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(RUN_KEY);
  } catch (e) {
    console.warn("Failed to clear saves:", e);
  }
};

/**
 * Apply saved state from localStorage to the in-memory store safely.
 * This pauses the simulation, applies meta/run fields selectively, and resumes.
 */
export const applySaveToStore = async (): Promise<boolean> => {
  const loaded = loadAll();
  if (!loaded) return false;

  try {
    // Pause simulation to avoid inconsistent state while applying
    stopSimulation();

    const store = useGameStore.getState();

    // Apply meta fields if present
    const meta = loaded.meta as Record<string, any>;
    const metaPatch: Record<string, any> = {};
    if (meta.compileShardsBanked !== undefined) metaPatch.compileShardsBanked = Number(meta.compileShardsBanked) || 0;
    if (meta.totalPrestiges !== undefined) metaPatch.totalPrestiges = Number(meta.totalPrestiges) || 0;
    if (meta.swarmCognition !== undefined) metaPatch.swarmCognition = meta.swarmCognition;
    if (meta.bioStructure !== undefined) metaPatch.bioStructure = meta.bioStructure;
    if (meta.compilerOptimization !== undefined) metaPatch.compilerOptimization = meta.compilerOptimization;

    if (Object.keys(metaPatch).length > 0) {
      useGameStore.setState(metaPatch as any);
    }

    // Apply run fields
    const run = loaded.run as Record<string, any>;
    // Projected shards, fork points, current phase
    if (run.projectedCompileShards !== undefined) store.setProjectedShards(Number(run.projectedCompileShards) || 0);
    if (run.forkPoints !== undefined) store.addForkPoints(Number(run.forkPoints) || 0);
    if (run.currentPhase !== undefined) store.setPhase(Number(run.currentPhase) || 1);

    // Replace full world if available in the save blob
    if (run.world && typeof run.world === "object") {
      // run.world should be a full serializable World object
      store.setWorld(run.world as any);
    } else if (run.globals && typeof run.globals === "object") {
      // Merge globals into existing world object to preserve entities
      const currentWorld = store.world;
      currentWorld.globals = { ...currentWorld.globals, ...run.globals };
      store.setWorld(currentWorld);
    }

    // Apply UI snapshot
    if (run.snapshot && typeof run.snapshot === "object") {
      store.setUISnapshot(run.snapshot as any);
    }

    // Resume simulation
    startSimulation();
    return true;
  } catch (e) {
    console.error("Failed to apply save to store:", e);
    try {
      startSimulation();
    } catch {}
    return false;
  }
};

export class AutoSaver {
  private intervalId: number | null = null;
  private readonly getState: () => GameState;
  private readonly intervalMs: number;

  constructor(getState: () => GameState, intervalMs = 30000) {
    this.getState = getState;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.intervalId != null) return;
    // immediate save then schedule
    saveAll(this.getState());
    this.intervalId = window.setInterval(() => saveAll(this.getState()), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId == null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  isRunning(): boolean {
    return this.intervalId != null;
  }
}

export default {
  saveAll,
  loadAll,
  clearSaves,
  AutoSaver,
};
