import { describe, it, expect } from "vitest";
import { getHaulingEffectiveRate } from "../sim/balance";

describe("Hauling Efficiency Formula", () => {
  it("should return 0 when no haulers present", () => {
    const rate = getHaulingEffectiveRate({
      haulerCount: 0,
      basePerDrone: 1,
      optimalDensity: 5,
    });

    expect(rate).toBe(0);
  });

  it("should give optimal efficiency at low drone counts", () => {
    const rate = getHaulingEffectiveRate({
      haulerCount: 1,
      basePerDrone: 1,
      optimalDensity: 10,
    });

    // At low density (1/10), efficiency should be close to 1
    // efficiency = 1 / (1 + (1/10)^2) = 1 / 1.01 ≈ 0.99
    expect(rate).toBeGreaterThan(0.99);
    expect(rate).toBeLessThanOrEqual(1);
  });

  it("should apply efficiency penalty when drone count exceeds optimal density", () => {
    const optimalDensity = 5;
    const basePerDrone = 1;

    const rateLow = getHaulingEffectiveRate({
      haulerCount: 5,
      basePerDrone,
      optimalDensity,
    });

    const rateHigh = getHaulingEffectiveRate({
      haulerCount: 10,
      basePerDrone,
      optimalDensity,
    });

    // At optimal density (5), efficiency is 1/(1+1) = 0.5, total = 5*1*0.5 = 2.5
    // At 2x optimal (10), efficiency is 1/(1+4) = 0.2, total = 10*1*0.2 = 2
    // So total rate actually DECREASES when well beyond optimal
    expect(rateLow).toBeCloseTo(2.5, 5);
    expect(rateHigh).toBeCloseTo(2, 5);
    expect(rateHigh).toBeLessThan(rateLow);

    // Per-drone rate should definitely decrease
    const perDroneLow = rateLow / 5;
    const perDroneHigh = rateHigh / 10;
    expect(perDroneHigh).toBeLessThan(perDroneLow);
  });

  it("should match formula: efficiency = 1 / (1 + (D/K)^2)", () => {
    const haulerCount = 8;
    const optimalDensity = 4;
    const basePerDrone = 2;

    const rate = getHaulingEffectiveRate({
      haulerCount,
      basePerDrone,
      optimalDensity,
    });

    // Calculate expected value manually
    const ratio = haulerCount / optimalDensity; // 8/4 = 2
    const efficiency = 1 / (1 + ratio * ratio); // 1 / (1 + 4) = 0.2
    const expected = haulerCount * basePerDrone * efficiency; // 8 * 2 * 0.2 = 3.2

    expect(rate).toBeCloseTo(expected, 5);
  });

  it("should show diminishing per-drone efficiency with many drones", () => {
    const optimalDensity = 5;
    const basePerDrone = 1;

    // Calculate per-drone efficiency at different densities
    const perDroneRates = [];
    for (let drones = 1; drones <= 10; drones++) {
      const totalRate = getHaulingEffectiveRate({
        haulerCount: drones,
        basePerDrone,
        optimalDensity,
      });
      perDroneRates.push(totalRate / drones);
    }

    // Verify that per-drone efficiency monotonically decreases
    for (let i = 1; i < perDroneRates.length; i++) {
      expect(perDroneRates[i]).toBeLessThan(perDroneRates[i - 1]);
    }

    // At 1 drone, per-drone rate should be close to basePerDrone
    expect(perDroneRates[0]).toBeGreaterThan(0.9 * basePerDrone);

    // At 10 drones (2x optimal), per-drone rate should be much lower
    expect(perDroneRates[9]).toBeLessThan(0.3 * basePerDrone);
  });

  it("should scale with basePerDrone parameter", () => {
    const params = {
      haulerCount: 5,
      basePerDrone: 1,
      optimalDensity: 5,
    };

    const rate1 = getHaulingEffectiveRate(params);
    const rate2 = getHaulingEffectiveRate({ ...params, basePerDrone: 2 });

    expect(rate2).toBeCloseTo(rate1 * 2, 5);
  });

  it("should handle edge case of optimal density being 0", () => {
    // When optimal density is 0, function should handle gracefully
    const rate = getHaulingEffectiveRate({
      haulerCount: 5,
      basePerDrone: 1,
      optimalDensity: 0,
    });

    // Should still return a valid number (not NaN or Infinity)
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(isFinite(rate)).toBe(true);
  });

  it("should verify specific test case from issue", () => {
    // Test the formula: efficiency = 1 / (1 + (D/K)^2)
    const D = 10; // drone count
    const K = 5; // optimal density
    const base = 1;

    const rate = getHaulingEffectiveRate({
      haulerCount: D,
      basePerDrone: base,
      optimalDensity: K,
    });

    const ratio = D / K; // 2
    const efficiency = 1 / (1 + ratio * ratio); // 1 / 5 = 0.2
    const expected = D * base * efficiency; // 10 * 1 * 0.2 = 2

    expect(rate).toBeCloseTo(expected, 5);
    expect(rate).toBeCloseTo(2, 5);
  });
});
