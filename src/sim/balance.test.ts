import { describe, expect, it } from "vitest";
import type { Producer } from "../ecs/components/Producer";
import type { WorldGlobals } from "../ecs/world/World";
import {
  computeHeatRatio,
  getCompileShardEstimate,
  getHaulingEffectiveRate,
  getProducerOutputPerSec,
  polyCost,
} from "./balance";

const createGlobals = (overrides: Partial<WorldGlobals> = {}): WorldGlobals => ({
  heatCurrent: 0,
  heatSafeCap: 100,
  powerAvailable: 0,
  powerDemand: 0,
  overclockEnabled: false,
  peakThroughput: 0,
  throughputPerSec: 0,
  cohesionScore: 0,
  stressSecondsAccum: 0,
  simTimeSeconds: 0,
  projectedShards: 0,
  ...overrides,
});

const createProducer = (overrides: Partial<Producer> = {}): Producer => ({
  recipe: { inputs: {}, outputs: { Iron: 1 } },
  progress: 0,
  baseRate: 1,
  tier: 1,
  active: true,
  ...overrides,
});

describe("balance helpers", () => {
  it("computes heat ratio using safe cap", () => {
    const globals = createGlobals({ heatCurrent: 50, heatSafeCap: 100 });
    expect(computeHeatRatio(globals)).toBeCloseTo(0.5);
  });

  it("returns zero output when producer inactive", () => {
    const globals = createGlobals();
    const producer = createProducer({ active: false });
    expect(getProducerOutputPerSec(producer, globals)).toBe(0);
  });

  it("scales output with tier and heat modifiers", () => {
    const globals = createGlobals({ heatCurrent: 100, heatSafeCap: 100 });
    const producer = createProducer({ baseRate: 2, tier: 2 });
    const expected =
      2 * Math.max(1, 2) ** 1.5 * (1 / (1 + computeHeatRatio(globals)));
    expect(getProducerOutputPerSec(producer, globals)).toBeCloseTo(expected);
  });

  it("produces monotonic polyCost scaling", () => {
    const costs = [1, 2, 3, 4, 5].map((level) =>
      polyCost(level, 10, 0.6, 0.8, 1),
    );
    for (let i = 1; i < costs.length; i += 1) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it("reduces hauling efficiency as density increases", () => {
    const optimalRate = getHaulingEffectiveRate({
      haulerCount: 10,
      basePerDrone: 2,
      optimalDensity: 10,
    });
    const congestedRate = getHaulingEffectiveRate({
      haulerCount: 40,
      basePerDrone: 2,
      optimalDensity: 10,
    });

    expect(optimalRate).toBeGreaterThan(0);
    expect(congestedRate).toBeLessThan(optimalRate);
  });

  it("estimates compile shards with yield multiplier applied", () => {
    const estimate = getCompileShardEstimate({
      peakThroughput: 100,
      cohesionScore: 20,
      stressSecondsAccum: 60,
      yieldMult: 1.5,
    });

    const baseline = getCompileShardEstimate({
      peakThroughput: 100,
      cohesionScore: 20,
      stressSecondsAccum: 60,
      yieldMult: 1,
    });

    expect(estimate).toBeGreaterThan(baseline);
    expect(estimate).toBeGreaterThan(0);
  });
});
