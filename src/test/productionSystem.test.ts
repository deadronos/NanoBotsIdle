import { describe, it, expect, beforeEach } from "vitest";
import { productionSystem } from "../ecs/systems/productionSystem";
import { World } from "../ecs/world/World";
import { getProducerOutputPerSec } from "../sim/balance";

describe("Production System", () => {
  let world: World;

  beforeEach(() => {
    world = {
      nextEntityId: 10,
      position: {},
      inventory: {},
      producer: {},
      heatSource: {},
      heatSink: {},
      powerLink: {},
      droneBrain: {},
      path: {},
      overclockable: {},
      compileEmitter: {},
      entityType: {},
      globals: {
        heatCurrent: 0,
        heatSafeCap: 100,
        powerAvailable: 10,
        powerDemand: 0,
        overclockEnabled: false,
        peakThroughput: 0,
        cohesionScore: 0,
        stressSecondsAccum: 0,
        simTimeSeconds: 0,
      },
      taskRequests: [],
      grid: {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      },
    };
  });

  describe("Production Formula Verification", () => {
    it("should calculate base production rate correctly", () => {
      const rate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 1,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      // At tier 1, no heat: rate = 1.0 * (1^1.5) / (1 + 0) = 1.0
      expect(rate).toBe(1.0);
    });

    it("should apply tier multiplier with power of 1.5", () => {
      const tier1Rate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 1,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      const tier2Rate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      const tier3Rate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 3,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      // tier^1.5: 1^1.5 = 1, 2^1.5 ≈ 2.828, 3^1.5 ≈ 5.196
      expect(tier1Rate).toBeCloseTo(1.0, 2);
      expect(tier2Rate).toBeCloseTo(2.828, 2);
      expect(tier3Rate).toBeCloseTo(5.196, 2);
    });

    it("should apply heat penalty correctly", () => {
      const noHeatRate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      const halfHeatRate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 50,
        heatSafeCap: 100,
      });

      const fullHeatRate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 100,
        heatSafeCap: 100,
      });

      // At 50% heat: rate = 2.828 / (1 + 0.5) ≈ 1.885
      // At 100% heat: rate = 2.828 / (1 + 1.0) ≈ 1.414
      expect(halfHeatRate).toBeCloseTo(1.885, 2);
      expect(fullHeatRate).toBeCloseTo(1.414, 2);
      expect(fullHeatRate).toBeLessThan(halfHeatRate);
      expect(halfHeatRate).toBeLessThan(noHeatRate);
    });

    it("should reduce production significantly at high heat", () => {
      const baseRate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 0,
        heatSafeCap: 100,
      });

      const extremeHeatRate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 2,
        heatCurrent: 300,
        heatSafeCap: 100,
      });

      // At 300% heat: rate = 2.828 / (1 + 3) ≈ 0.707
      expect(extremeHeatRate).toBeCloseTo(0.707, 2);
      expect(extremeHeatRate).toBeLessThan(baseRate * 0.3);
    });

    it("should handle zero heat cap safely", () => {
      const rate = getProducerOutputPerSec({
        baseRate: 1.0,
        tier: 1,
        heatCurrent: 50,
        heatSafeCap: 0,
      });

      // Should not crash and return base rate
      expect(rate).toBe(1.0);
    });
  });

  describe("Production System Integration", () => {
    it("should produce resources when inputs are available", () => {
      const producerId = 1;

      world.entityType[producerId] = "Assembler";
      world.inventory[producerId] = {
        capacity: 50,
        contents: { Carbon: 10 },
      };
      world.producer[producerId] = {
        recipe: {
          inputs: { Carbon: 2 },
          outputs: { Components: 1 },
          batchTimeSeconds: 2,
        },
        progress: 0,
        baseRate: 0.5,
        tier: 1,
        active: true,
      };

      // Run for 4 seconds
      // baseRate=0.5, tier=1, no heat: outputRate = 0.5 items/sec
      // progressDelta = (0.5 * 4) / 2 = 1.0 (completes 1 batch)
      productionSystem(world, 4);

      // Should have completed 1 batch: consumed 2 Carbon, produced 1 Component
      expect(world.inventory[producerId].contents.Carbon).toBe(8);
      expect(world.inventory[producerId].contents.Components).toBe(1);
    });

    it("should stop production when inputs are insufficient", () => {
      const producerId = 1;

      world.entityType[producerId] = "Assembler";
      world.inventory[producerId] = {
        capacity: 50,
        contents: { Carbon: 1 }, // Not enough for 1 batch (needs 2)
      };
      world.producer[producerId] = {
        recipe: {
          inputs: { Carbon: 2 },
          outputs: { Components: 1 },
          batchTimeSeconds: 2,
        },
        progress: 0,
        baseRate: 0.5,
        tier: 1,
        active: true,
      };

      productionSystem(world, 4);

      // Should not produce anything
      expect(world.producer[producerId].active).toBe(false);
      expect(world.inventory[producerId].contents.Components).toBeUndefined();
    });

    it("should apply overclock multiplier when enabled", () => {
      const producerId = 1;

      world.entityType[producerId] = "Extractor";
      world.inventory[producerId] = {
        capacity: 50,
        contents: {},
      };
      world.producer[producerId] = {
        recipe: {
          inputs: {},
          outputs: { Carbon: 1 },
          batchTimeSeconds: 1,
        },
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: true,
      };
      world.overclockable[producerId] = {
        safeRateMult: 1.0,
        overRateMult: 2.0,
        heatMultiplier: 3.0,
      };

      world.globals.overclockEnabled = true;

      // Run for 1 second with 2x overclock
      // baseRate=1, tier=1, no heat: outputRate = 1.0 items/sec
      // With 2x overclock: effectiveRate = 2.0 items/sec
      // progressDelta = (2.0 * 1) / 1 = 2.0 (completes 2 batches)
      productionSystem(world, 1);

      // Should produce 2 Carbon (2 batches completed)
      expect(world.inventory[producerId].contents.Carbon).toBe(2);
    });

    it("should accumulate progress across multiple ticks", () => {
      const producerId = 1;

      world.entityType[producerId] = "Fabricator";
      world.inventory[producerId] = {
        capacity: 50,
        contents: { Components: 10 },
      };
      world.producer[producerId] = {
        recipe: {
          inputs: { Components: 3 },
          outputs: { DroneFrame: 1 },
          batchTimeSeconds: 5,
        },
        progress: 0,
        baseRate: 0.25,
        tier: 1,
        active: true,
      };

      // Run 5 ticks of 1 second each
      // baseRate=0.25, tier=1, no heat: outputRate = 0.25 items/sec
      // progressDelta per tick = (0.25 * 1) / 5 = 0.05
      // After 5 ticks: progress = 0.25 (not enough to complete 1 batch)
      for (let i = 0; i < 5; i++) {
        productionSystem(world, 1);
      }

      // Should NOT complete any batch (need 20 seconds total at this rate)
      expect(world.inventory[producerId].contents.Components).toBe(10);
      expect(world.inventory[producerId].contents.DroneFrame).toBeUndefined();
      expect(world.producer[producerId].progress).toBeCloseTo(0.25, 1);
    });

    it("should respect heat penalty in production rate", () => {
      const producerId = 1;

      world.entityType[producerId] = "Extractor";
      world.inventory[producerId] = {
        capacity: 50,
        contents: {},
      };
      world.producer[producerId] = {
        recipe: {
          inputs: {},
          outputs: { Carbon: 1 },
          batchTimeSeconds: 1,
        },
        progress: 0,
        baseRate: 1,
        tier: 2,
        active: true,
      };

      // Set high heat
      world.globals.heatCurrent = 200;
      world.globals.heatSafeCap = 100;

      // Run for 1 second
      productionSystem(world, 1);

      // At tier 2 with 200% heat: rate = 2.828 / 3 ≈ 0.943
      // Progress should be about 0.943
      expect(world.producer[producerId].progress).toBeCloseTo(0.943, 1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle extractors with no inputs", () => {
      const extractorId = 1;

      world.entityType[extractorId] = "Extractor";
      world.inventory[extractorId] = {
        capacity: 50,
        contents: {},
      };
      world.producer[extractorId] = {
        recipe: {
          inputs: {},
          outputs: { Carbon: 1 },
          batchTimeSeconds: 1,
        },
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: true,
      };

      // Run for 2 seconds
      // baseRate=1, tier=1, no heat: outputRate = 1.0 items/sec
      // progressDelta = (1.0 * 2) / 1 = 2.0 (completes 2 batches)
      productionSystem(world, 2);

      // Should produce 2 Carbon (2 batches completed)
      expect(world.inventory[extractorId].contents.Carbon).toBe(2);
    });

    it("should handle multiple resources in recipes", () => {
      const producerId = 1;

      world.entityType[producerId] = "Advanced";
      world.inventory[producerId] = {
        capacity: 100,
        contents: {
          Carbon: 10,
          Components: 5,
        },
      };
      world.producer[producerId] = {
        recipe: {
          inputs: { Carbon: 2, Components: 1 },
          outputs: { TissueMass: 1 },
          batchTimeSeconds: 2,
        },
        progress: 0,
        baseRate: 1.0,
        tier: 1,
        active: true,
      };

      // Run for 2 seconds
      // baseRate=1.0, tier=1, no heat: outputRate = 1.0 items/sec
      // progressDelta = (1.0 * 2) / 2 = 1.0 (completes 1 batch)
      productionSystem(world, 2);

      // Should consume 2 Carbon and 1 Component, produce 1 TissueMass
      expect(world.inventory[producerId].contents.Carbon).toBe(8);
      expect(world.inventory[producerId].contents.Components).toBe(4);
      expect(world.inventory[producerId].contents.TissueMass).toBe(1);
    });
  });
});
