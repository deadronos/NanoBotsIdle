import { describe, expect, it } from "vitest";
import { allocateEntityId, createWorld } from "../world/createWorld";
import productionSystem from "./productionSystem";

const runTick = (world: ReturnType<typeof createWorld>, dt = 1): void => {
  productionSystem.update(world, dt);
};

describe("productionSystem", () => {
  it("produces resources for active producers without inputs", () => {
    const world = createWorld();
    const entityId = allocateEntityId(world);

    world.inventory[entityId] = { capacity: 10, contents: {} };
    world.producer[entityId] = {
      recipe: { inputs: {}, outputs: { Iron: 1 } },
      progress: 0,
      baseRate: 2,
      tier: 1,
      active: true,
    };

    runTick(world, 1);

    expect(world.inventory[entityId].contents.Iron).toBe(2);
    expect(world.producer[entityId].progress).toBe(0);
    expect(world.globals.peakThroughput).toBeGreaterThan(0);
    expect(world.globals.throughputPerSec).toBeGreaterThan(0);
  });

  it("limits production based on input availability", () => {
    const world = createWorld();
    const entityId = allocateEntityId(world);

    world.inventory[entityId] = {
      capacity: 10,
      contents: { Carbon: 3 },
    };
    world.producer[entityId] = {
      recipe: { inputs: { Carbon: 2 }, outputs: { Iron: 1 } },
      progress: 0,
      baseRate: 3,
      tier: 1,
      active: true,
    };

    runTick(world, 1);

    expect(world.inventory[entityId].contents.Carbon).toBeCloseTo(1);
    expect(world.inventory[entityId].contents.Iron).toBe(1);
    expect(world.producer[entityId].progress).toBeGreaterThan(0);
    expect(world.globals.throughputPerSec).toBeGreaterThan(0);
  });

  it("prevents production when capacity is exhausted and caps progress", () => {
    const world = createWorld();
    const entityId = allocateEntityId(world);

    world.inventory[entityId] = {
      capacity: 2,
      contents: { Iron: 2 },
    };
    world.producer[entityId] = {
      recipe: { inputs: {}, outputs: { Iron: 1 } },
      progress: 0,
      baseRate: 2,
      tier: 1,
      active: true,
    };

    runTick(world, 1);

    expect(world.inventory[entityId].contents.Iron).toBe(2);
    expect(world.producer[entityId].progress).toBeLessThanOrEqual(1);
    expect(world.globals.throughputPerSec).toBe(0);
  });
});
