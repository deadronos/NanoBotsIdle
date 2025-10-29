import { describe, it, expect, beforeEach } from "vitest";
import { createWorld } from "../ecs/world/createWorld";
import { heatAndPowerSystem } from "../ecs/systems/heatAndPowerSystem";
import { productionSystem } from "../ecs/systems/productionSystem";
import { World } from "../ecs/world/World";

describe("Overclock Mode and Phase 3 Mechanics", () => {
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

  describe("Overclock Multipliers", () => {
    it("should apply 2-3x production multiplier when overclocked", () => {
      // Find an extractor to test
      const extractorId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      )?.[0];

      if (!extractorId) {
        throw new Error("No extractor found");
      }

      const id = Number(extractorId);
      const overclockable = world.overclockable[id];

      expect(overclockable).toBeDefined();
      expect(overclockable?.overRateMult).toBeGreaterThanOrEqual(2.0);
      expect(overclockable?.overRateMult).toBeLessThanOrEqual(5.0);
    });

    it("should increase heat generation when overclocked", () => {
      // Set up initial conditions
      world.globals.heatCurrent = 0;
      world.globals.overclockEnabled = false;

      // Run without overclock
      heatAndPowerSystem(world, 1.0);
      const heatWithoutOverclock = world.globals.heatCurrent;

      // Reset and run with overclock
      world.globals.heatCurrent = 0;
      world.globals.overclockEnabled = true;

      heatAndPowerSystem(world, 1.0);
      const heatWithOverclock = world.globals.heatCurrent;

      // Heat should be significantly higher with overclock
      expect(heatWithOverclock).toBeGreaterThan(heatWithoutOverclock * 2);
    });
  });

  describe("Stress Seconds Accumulation", () => {
    it("should accumulate stress when overclocked and over safe cap", () => {
      world.globals.overclockEnabled = true;
      world.globals.heatCurrent = world.globals.heatSafeCap * 1.2;
      world.globals.stressSecondsAccum = 0;

      heatAndPowerSystem(world, 2.0);

      expect(world.globals.stressSecondsAccum).toBe(2.0);
    });

    it("should not accumulate stress when not overclocked", () => {
      world.globals.overclockEnabled = false;
      world.globals.heatCurrent = world.globals.heatSafeCap * 1.5;
      world.globals.stressSecondsAccum = 0;

      heatAndPowerSystem(world, 2.0);

      expect(world.globals.stressSecondsAccum).toBe(0);
    });

    it("should not accumulate stress when under safe cap", () => {
      world.globals.overclockEnabled = true;
      world.globals.heatCurrent = world.globals.heatSafeCap * 0.8;
      world.globals.stressSecondsAccum = 0;

      heatAndPowerSystem(world, 2.0);

      expect(world.globals.stressSecondsAccum).toBe(0);
    });
  });

  describe("Heat Cascade Failure", () => {
    it("should not cause failures below 150% heat", () => {
      world.globals.heatCurrent = world.globals.heatSafeCap * 1.4;

      // Get initial online state
      const initialOnlineCount = Object.values(world.powerLink).filter(
        (link) => link.online
      ).length;

      // Run for a while
      for (let i = 0; i < 100; i++) {
        heatAndPowerSystem(world, 0.1);
      }

      const finalOnlineCount = Object.values(world.powerLink).filter(
        (link) => link.online
      ).length;

      // All buildings should still be online
      expect(finalOnlineCount).toBe(initialOnlineCount);
    });

    it("should potentially cause failures above 150% heat", () => {
      world.globals.heatCurrent = world.globals.heatSafeCap * 3.0;

      // Run for a longer time to ensure some failures occur
      for (let i = 0; i < 100; i++) {
        heatAndPowerSystem(world, 0.1);
      }

      // Check if any buildings went offline
      const offlineCount = Object.values(world.powerLink).filter(
        (link) => !link.online
      ).length;

      // At 3.0x heat, we should see at least some failures
      // This is probabilistic, so we can't guarantee, but it's very likely
      expect(offlineCount).toBeGreaterThan(0);
    });
  });

  describe("Production Under Overclock", () => {
    it("should have higher overRateMult than 1.0 for production buildings", () => {
      // Check all production buildings have overclock multipliers
      Object.entries(world.producer).forEach(([idStr]) => {
        const id = Number(idStr);
        const overclockable = world.overclockable[id];
        
        if (overclockable) {
          // All production buildings should have 2-5x overclock multipliers
          expect(overclockable.overRateMult).toBeGreaterThanOrEqual(2.0);
          expect(overclockable.overRateMult).toBeLessThanOrEqual(5.0);
          
          // Heat multiplier should be significantly higher (3-5x)
          expect(overclockable.heatMultiplier).toBeGreaterThanOrEqual(3.0);
          expect(overclockable.heatMultiplier).toBeLessThanOrEqual(5.0);
        }
      });
    });
  });
});
