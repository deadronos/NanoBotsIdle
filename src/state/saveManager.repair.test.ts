import { afterEach, describe, expect, it } from "vitest";

import { clearSaves, applySaveToStore } from "./saveManager";
import { useGameStore } from "./store";
import { createWorld } from "../ecs/world/createWorld";

const META_KEY = "nanofactory-save-meta";
const RUN_KEY = "nanofactory-save-run";

afterEach(() => {
  clearSaves();
});

describe("applySaveToStore repairs and normalizes saved world", () => {
  it("applySaveToStore repairs missing drones from saved world", async () => {
    clearSaves();

    const meta = { version: 1, timestamp: Date.now(), data: {} };
    const baseline = createWorld();
    const savedWorld = JSON.parse(JSON.stringify(baseline));
    savedWorld.entityType = { "5": "core" };
    savedWorld.position = { "5": { x: 0, y: 0 } };
    savedWorld.droneBrain = {};
    savedWorld.nextEntityId = "NaN";

    const run = { version: 1, timestamp: Date.now(), data: { world: savedWorld } };

    localStorage.setItem(META_KEY, JSON.stringify(meta));
    localStorage.setItem(RUN_KEY, JSON.stringify(run));

    const applied = await applySaveToStore();
    expect(applied).toBe(true);

    const drones = Object.values(useGameStore.getState().world.droneBrain || {});
    expect(drones.length).toBeGreaterThan(0);
    expect(drones.some((d: any) => d.role === "hauler")).toBe(true);
  });

  it("applySaveToStore computes a safe nextEntityId from existing ids", async () => {
    clearSaves();

    const meta2 = { version: 1, timestamp: Date.now(), data: {} };
    const baseline2 = createWorld();
    const savedWorld2 = JSON.parse(JSON.stringify(baseline2));
    savedWorld2.entityType = { "2": "core", "7": "building" };
    savedWorld2.position = { "2": { x: 0, y: 0 }, "7": { x: 1, y: 1 } };
    savedWorld2.droneBrain = {};
    savedWorld2.nextEntityId = "NaN";

    const run2 = { version: 1, timestamp: Date.now(), data: { world: savedWorld2 } };

    localStorage.setItem(META_KEY, JSON.stringify(meta2));
    localStorage.setItem(RUN_KEY, JSON.stringify(run2));

    const applied = await applySaveToStore();
    expect(applied).toBe(true);

    const nextId = useGameStore.getState().world.nextEntityId as number;
    expect(Number.isFinite(nextId)).toBe(true);
    expect(nextId).toBeGreaterThan(7);
  });

  it("applySaveToStore normalizes missing grid and keeps isWalkable bounded", async () => {
    clearSaves();

    const meta3 = { version: 1, timestamp: Date.now(), data: {} };
    const baseline3 = createWorld();
    const savedWorld3 = JSON.parse(JSON.stringify(baseline3));
    savedWorld3.entityType = { "1": "core" };
    savedWorld3.position = { "1": { x: 0, y: 0 } };
    savedWorld3.droneBrain = {};
    savedWorld3.nextEntityId = "NaN";
    delete savedWorld3.grid;

    const run3 = { version: 1, timestamp: Date.now(), data: { world: savedWorld3 } };

    localStorage.setItem(META_KEY, JSON.stringify(meta3));
    localStorage.setItem(RUN_KEY, JSON.stringify(run3));

    const applied = await applySaveToStore();
    expect(applied).toBe(true);

    const grid = useGameStore.getState().world.grid as any;
    expect(Number.isFinite(grid.width)).toBe(true);
    expect(Number.isFinite(grid.height)).toBe(true);
    expect(grid.isWalkable(0, 0)).toBe(true);
    expect(grid.isWalkable(-1, -1)).toBe(false);
  });
});
