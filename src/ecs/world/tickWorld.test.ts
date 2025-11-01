import { describe, expect, it } from "vitest";
import { createWorld } from "./createWorld";
import { DEFAULT_SYSTEM_ORDER, tickWorld } from "./tickWorld";
import { runTickHarness } from "./tickHarness";

const flattenOrder = (orders: readonly string[][]): string[] =>
  orders.flatMap((order) => order);

describe("tickWorld", () => {
  it("invokes systems in the documented deterministic order", () => {
    const world = createWorld();
    const steps = 3;
    const { callOrder } = runTickHarness(world, 0.1, {
      steps,
      skipSystemExecution: true,
    });

    const expectedOrder = flattenOrder(
      Array.from({ length: steps }, () => [...DEFAULT_SYSTEM_ORDER]),
    );

    expect(callOrder).toEqual(expectedOrder);
  });

  it("increments world time by clamped dt", () => {
    const world = createWorld();

    tickWorld(world, 0.5);
    expect(world.globals.simTimeSeconds).toBeCloseTo(0.5);

    tickWorld(world, -1);
    expect(world.globals.simTimeSeconds).toBeCloseTo(0.5);
  });
});
