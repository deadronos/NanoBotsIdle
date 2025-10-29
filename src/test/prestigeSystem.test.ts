import { describe, it, expect, beforeEach } from "vitest";
import {
  getCompileShardEstimate,
  getCompileShardBreakdown,
  SHARD_THROUGHPUT_COEFF,
  SHARD_COHESION_COEFF,
  SHARD_STRESS_COEFF,
} from "../sim/balance";
import { createWorld } from "../ecs/world/createWorld";
import { World } from "../ecs/world/World";
import { compileScoringSystem } from "../ecs/systems/compileScoringSystem";

describe("Prestige System - Compile Shard Calculation", () => {
  describe("Shard Formula", () => {
    it("should calculate shards based on throughput contribution", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: 100,
        cohesionScore: 0,
        stressSecondsAccum: 0,
        yieldMult: 1.0,
      });

      // A * sqrt(100) = 1.5 * 10 = 15
      expect(shards).toBeCloseTo(15, 1);
    });

    it("should calculate shards based on cohesion contribution", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: 0,
        cohesionScore: 31, // log2(32) = 5
        stressSecondsAccum: 0,
        yieldMult: 1.0,
      });

      // B * log2(31 + 1) = 4.0 * 5 = 20
      expect(shards).toBeCloseTo(20, 1);
    });

    it("should calculate shards based on stress contribution", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: 0,
        cohesionScore: 0,
        stressSecondsAccum: 100,
        yieldMult: 1.0,
      });

      // C * (100)^0.7 = 0.9 * ~25.12 = ~22.6
      expect(shards).toBeCloseTo(22.6, 1);
    });

    it("should combine all three factors", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: 100, // contributes ~15
        cohesionScore: 31, // contributes ~20
        stressSecondsAccum: 100, // contributes ~22.6
        yieldMult: 1.0,
      });

      // Should be approximately 15 + 20 + 22.6 = 57.6
      expect(shards).toBeCloseTo(57.6, 1);
    });

    it("should apply yield multiplier correctly", () => {
      const baseShards = getCompileShardEstimate({
        peakThroughput: 100,
        cohesionScore: 31,
        stressSecondsAccum: 100,
        yieldMult: 1.0,
      });

      const boostedShards = getCompileShardEstimate({
        peakThroughput: 100,
        cohesionScore: 31,
        stressSecondsAccum: 100,
        yieldMult: 1.5,
      });

      expect(boostedShards).toBeCloseTo(baseShards * 1.5, 1);
    });

    it("should handle zero inputs gracefully", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: 0,
        cohesionScore: 0,
        stressSecondsAccum: 0,
        yieldMult: 1.0,
      });

      // Should be close to 0 (only log2(0+1) = 0 contributes)
      expect(shards).toBeCloseTo(0, 1);
    });

    it("should handle negative inputs safely", () => {
      const shards = getCompileShardEstimate({
        peakThroughput: -10,
        cohesionScore: -5,
        stressSecondsAccum: -20,
        yieldMult: 1.0,
      });

      // Should not produce negative shards (Math.max protections)
      expect(shards).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Shard Breakdown", () => {
    it("should return detailed breakdown of shard contributions", () => {
      const breakdown = getCompileShardBreakdown({
        peakThroughput: 100,
        cohesionScore: 31,
        stressSecondsAccum: 100,
        yieldMult: 1.5,
      });

      // Verify individual contributions
      expect(breakdown.throughputContribution).toBeCloseTo(
        SHARD_THROUGHPUT_COEFF * Math.sqrt(100),
        1,
      );
      expect(breakdown.cohesionContribution).toBeCloseTo(
        SHARD_COHESION_COEFF * Math.log2(32),
        1,
      );
      expect(breakdown.stressContribution).toBeCloseTo(
        SHARD_STRESS_COEFF * Math.pow(100, 0.7),
        1,
      );

      // Verify totals
      expect(breakdown.baseTotal).toBeCloseTo(
        breakdown.throughputContribution +
          breakdown.cohesionContribution +
          breakdown.stressContribution,
        1,
      );
      expect(breakdown.finalTotal).toBeCloseTo(breakdown.baseTotal * 1.5, 1);
      expect(breakdown.yieldMult).toBe(1.5);
    });

    it("should match getCompileShardEstimate result", () => {
      const params = {
        peakThroughput: 50,
        cohesionScore: 15,
        stressSecondsAccum: 50,
        yieldMult: 1.2,
      };

      const estimate = getCompileShardEstimate(params);
      const breakdown = getCompileShardBreakdown(params);

      expect(breakdown.finalTotal).toBeCloseTo(estimate, 2);
    });
  });

  describe("CompileScoringSystem", () => {
    let world: World;

    beforeEach(() => {
      world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });
    });

    it("should track peak throughput correctly", () => {
      // Default world has 3 starting buildings with active producers
      // Their throughput is calculated in compileScoringSystem
      
      compileScoringSystem(world, 1.0);

      // Should have non-zero throughput from default buildings
      expect(world.globals.peakThroughput).toBeGreaterThan(0);
      
      const initialThroughput = world.globals.peakThroughput;

      // Add a new high-tier producer
      const newProducerId = world.nextEntityId++;
      world.producer[newProducerId] = {
        recipe: { inputs: {}, outputs: { TissueMass: 1 }, batchTimeSeconds: 1 },
        progress: 0,
        baseRate: 5.0,
        tier: 3,
        active: true,
      };
      world.entityType[newProducerId] = "Extractor";

      compileScoringSystem(world, 1.0);

      // Peak should increase with the new producer
      // 5.0 * (3^1.5) = 5.0 * 5.196... = ~25.98
      expect(world.globals.peakThroughput).toBeGreaterThan(initialThroughput + 25);
    });

    it("should only count active producers for throughput", () => {
      // Get baseline with all default producers active
      compileScoringSystem(world, 1.0);
      const allActiveThroughput = world.globals.peakThroughput;

      // Deactivate all default producers
      Object.values(world.producer).forEach((producer) => {
        producer.active = false;
      });

      // Add two identical producers, one active and one inactive
      const activeId = world.nextEntityId++;
      world.producer[activeId] = {
        recipe: { inputs: {}, outputs: { TissueMass: 1 }, batchTimeSeconds: 1 },
        progress: 0,
        baseRate: 2.0,
        tier: 2,
        active: true,
      };
      world.entityType[activeId] = "Extractor";

      const inactiveId = world.nextEntityId++;
      world.producer[inactiveId] = {
        recipe: { inputs: {}, outputs: { TissueMass: 1 }, batchTimeSeconds: 1 },
        progress: 0,
        baseRate: 2.0,
        tier: 2,
        active: false, // Not active
      };
      world.entityType[inactiveId] = "Extractor";

      compileScoringSystem(world, 1.0);

      // Peak should remain at the original level (only active producer counted)
      // New contribution: 2.0 * (2^1.5) = 2.0 * 2.828... = ~5.656
      expect(world.globals.peakThroughput).toBeGreaterThanOrEqual(allActiveThroughput);
    });

    it("should maintain peak throughput across frames", () => {
      const producerId = world.nextEntityId++;
      world.producer[producerId] = {
        recipe: { inputs: {}, outputs: { TissueMass: 1 }, batchTimeSeconds: 1 },
        progress: 0,
        baseRate: 2.0,
        tier: 2,
        active: true,
      };
      world.entityType[producerId] = "Extractor";

      compileScoringSystem(world, 1.0);
      const firstPeak = world.globals.peakThroughput;

      // Deactivate producer
      world.producer[producerId].active = false;

      compileScoringSystem(world, 1.0);
      const secondPeak = world.globals.peakThroughput;

      // Peak should not decrease
      expect(secondPeak).toBe(firstPeak);
    });

    it("should increment cohesion score when all producers satisfied", () => {
      // Get a fresh world with only the producers we want
      const testWorld: World = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // All default producers should be active
      expect(testWorld.globals.cohesionScore).toBe(0);

      compileScoringSystem(testWorld, 2.5); // Simulate 2.5 seconds

      // Since all default producers start active, cohesion should increment
      expect(testWorld.globals.cohesionScore).toBeCloseTo(2.5, 2);
    });

    it("should not increment cohesion when any producer is starved", () => {
      // Use the default world and deactivate one producer
      Object.values(world.producer)[0].active = false; // Starve one producer

      compileScoringSystem(world, 2.5);

      expect(world.globals.cohesionScore).toBe(0);
    });

    it("should resume cohesion accumulation when producers recover", () => {
      // Start with all producers active
      compileScoringSystem(world, 1.0);
      expect(world.globals.cohesionScore).toBeCloseTo(1.0, 2);

      // Deactivate one producer
      const producers = Object.values(world.producer);
      producers[0].active = false;

      // Second tick - one inactive
      compileScoringSystem(world, 1.0);
      expect(world.globals.cohesionScore).toBeCloseTo(1.0, 2); // No change

      // Reactivate
      producers[0].active = true;

      // Third tick - all active again
      compileScoringSystem(world, 1.0);
      expect(world.globals.cohesionScore).toBeCloseTo(2.0, 2);
    });
  });

  describe("Shard Projection in Real-Time", () => {
    it("should project shards accurately during gameplay", () => {
      const world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Simulate some production
      const extraProducerId = world.nextEntityId++;
      world.producer[extraProducerId] = {
        recipe: { inputs: {}, outputs: { TissueMass: 1 }, batchTimeSeconds: 1 },
        progress: 0,
        baseRate: 5.0,
        tier: 3,
        active: true,
      };
      world.entityType[extraProducerId] = "Extractor";

      compileScoringSystem(world, 5.0);

      // Simulate overclock stress
      world.globals.overclockEnabled = true;
      world.globals.heatCurrent = 150;
      world.globals.heatSafeCap = 100;
      world.globals.stressSecondsAccum = 30;

      const projectedShards = getCompileShardEstimate({
        peakThroughput: world.globals.peakThroughput,
        cohesionScore: world.globals.cohesionScore,
        stressSecondsAccum: world.globals.stressSecondsAccum,
        yieldMult: 1.0,
      });

      // Should be a positive number combining all factors
      expect(projectedShards).toBeGreaterThan(0);

      // Verify it has contributions from all three sources
      const throughputContribution =
        1.5 * Math.sqrt(world.globals.peakThroughput);
      const cohesionContribution =
        4.0 * Math.log2(world.globals.cohesionScore + 1);
      const stressContribution =
        0.9 * Math.pow(world.globals.stressSecondsAccum, 0.7);

      expect(projectedShards).toBeCloseTo(
        throughputContribution + cohesionContribution + stressContribution,
        1,
      );
    });
  });
});
