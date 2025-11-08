import { describe, expect, it } from "vitest";

import { createWorld } from "./createWorld";

const findExtractorEntry = (world: ReturnType<typeof createWorld>) =>
  Object.entries(world.producer).find(([, producer]) => {
    return Object.prototype.hasOwnProperty.call(
      producer.recipe.outputs,
      "Carbon",
    );
  });

describe("createWorld", () => {
  it("boots a populated world that reflects meta upgrades", () => {
    const world = createWorld({
      meta: {
        swarm: {
          congestionAvoidanceLevel: 2,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 1, builder: 2, maintainer: 1 },
        },
        bio: {
          startingRadius: 6,
          startingExtractorTier: 3,
          passiveCoolingBonus: 2,
        },
        compiler: {
          compileYieldMult: 2,
          overclockEfficiencyBonus: 3,
          recycleBonus: 1,
        },
      },
    });

    const coreIds = Object.entries(world.entityType).filter(
      ([, type]) => type === "core",
    );
    expect(coreIds).toHaveLength(1);
    const coreId = Number(coreIds[0][0]);

    expect(world.globals.heatSafeCap).toBe(140);
    expect(world.inventory[coreId]?.capacity).toBeGreaterThan(0);
    expect(world.compileEmitter[coreId]?.compileRate).toBeGreaterThanOrEqual(2);

    const extractorEntry = findExtractorEntry(world);
    expect(extractorEntry).toBeDefined();
    const [, extractor] = extractorEntry!;
    expect(extractor.tier).toBe(3);
    expect(extractor.active).toBe(true);

    const drones = Object.values(world.droneBrain);
    const haulers = drones.filter((drone) => drone.role === "hauler").length;
    const builders = drones.filter((drone) => drone.role === "builder").length;
    const maintainers = drones.filter(
      (drone) => drone.role === "maintainer",
    ).length;

    expect(haulers).toBe(2); // base 1 + meta 1
    expect(builders).toBe(3); // base 1 + meta 2
    expect(maintainers).toBe(1); // meta only

    expect(world.globals.powerDemand).toBeGreaterThan(0);
    expect(world.globals.powerAvailable).toBeGreaterThan(
      world.globals.powerDemand,
    );
  });

  it("can return an empty shell when spawnEntities is disabled", () => {
    const world = createWorld({ spawnEntities: false });

    expect(Object.keys(world.entityType)).toHaveLength(0);
    expect(Object.keys(world.droneBrain)).toHaveLength(0);
    expect(Object.keys(world.producer)).toHaveLength(0);
    expect(world.globals.heatSafeCap).toBe(0);
  });

  it('createWorld() returns at least one hauler by default', () => {
    const world = createWorld();

    const haulers = Object.values(world.droneBrain).filter(
      (d) => d.role === "hauler",
    ).length;
    expect(haulers).toBeGreaterThanOrEqual(1);
  });

  it('createWorld({ spawnEntities: false }) returns zero drones', () => {
    const world = createWorld({ spawnEntities: false });

    expect(Object.keys(world.droneBrain).length).toBe(0);
  });
});
