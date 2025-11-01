import { describe, expect, it } from "vitest";
import { createWorld, allocateEntityId } from "../world/createWorld";
import heatAndPowerSystem from "./heatAndPowerSystem";
import { getProducerOutputPerSec } from "../../sim/balance";

describe("heatAndPowerSystem", () => {
  it("accumulates heat from heat sources and clamps to non-negative", () => {
    const world = createWorld({ spawnEntities: false });
    world.globals.heatSafeCap = 100;

    const srcId = allocateEntityId(world);
    world.position[srcId] = { x: 0, y: 0 };
    world.heatSource[srcId] = { heatPerSecond: 5 };

    // initial heat 0
    expect(world.globals.heatCurrent).toBe(0);

    heatAndPowerSystem.update(world, 2);

    // heat should increase by heatPerSecond * dt
    expect(world.globals.heatCurrent).toBeGreaterThan(0);

    // Test cooling: add sink
    const sinkId = allocateEntityId(world);
    world.position[sinkId] = { x: 1, y: 0 };
    world.heatSink[sinkId] = { coolingPerSecond: 10 };

    // With strong cooling, heat should decrease (but remain >= 0)
    heatAndPowerSystem.update(world, 1);
    expect(world.globals.heatCurrent).toBeGreaterThanOrEqual(0);
  });

  it("affects producer output via balance helper (higher heat reduces output)", () => {
    const world = createWorld({ spawnEntities: false });
    world.globals.heatSafeCap = 10;

    const entityId = allocateEntityId(world);
    world.inventory[entityId] = { capacity: 10, contents: {} };
    world.producer[entityId] = {
      recipe: { inputs: {}, outputs: { Iron: 1 } },
      progress: 0,
      baseRate: 2,
      tier: 1,
      active: true,
    };

    const producer = world.producer[entityId];

    // With no heat
    world.globals.heatCurrent = 0;
    const outCold = getProducerOutputPerSec(producer, world.globals);

    // With high heat equal to safe cap, output should be reduced
    world.globals.heatCurrent = 10;
    const outHot = getProducerOutputPerSec(producer, world.globals);

    expect(outHot).toBeLessThan(outCold);
  });
});
