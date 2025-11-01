import { describe, expect, it } from "vitest";
import type { Producer } from "../ecs/components/Producer";
import type { WorldGlobals } from "../ecs/world/World";
import { computeHeatRatio, getProducerOutputPerSec } from "./balance";

const createGlobals = (overrides: Partial<WorldGlobals> = {}): WorldGlobals => ({
  heatCurrent: 0,
  heatSafeCap: 100,
  powerAvailable: 0,
  powerDemand: 0,
  overclockEnabled: false,
  peakThroughput: 0,
  cohesionScore: 0,
  stressSecondsAccum: 0,
  simTimeSeconds: 0,
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
});
