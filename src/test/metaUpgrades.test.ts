import { describe, it, expect, beforeEach } from "vitest";
import { createMetaSlice, MetaSlice } from "../state/metaSlice";

describe("Meta Upgrade System", () => {
  let metaSlice: MetaSlice;

  beforeEach(() => {
    // Create a fresh metaSlice for each test
    const setState = (partial: Partial<MetaSlice>) => {
      Object.assign(metaSlice, partial);
    };
    const getState = () => metaSlice;
    
    metaSlice = createMetaSlice(setState as any, getState as any, {} as any);
  });

  describe("Upgrade Purchase Validation", () => {
    it("should allow purchasing Tier 1 upgrades with sufficient shards", () => {
      metaSlice.compileShardsBanked = 10;
      metaSlice.totalPrestiges = 0;

      const result = metaSlice.canPurchaseUpgrade("swarm.congestionAwareness");
      expect(result.canPurchase).toBe(true);
    });

    it("should block purchase with insufficient shards", () => {
      metaSlice.compileShardsBanked = 2;
      metaSlice.totalPrestiges = 0;

      const result = metaSlice.canPurchaseUpgrade("swarm.congestionAwareness");
      expect(result.canPurchase).toBe(false);
      expect(result.reason).toContain("Need 5 shards");
    });

    it("should block purchase without meeting prestige requirements", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 0;

      const result = metaSlice.canPurchaseUpgrade("swarm.predictiveHauling");
      expect(result.canPurchase).toBe(false);
      expect(result.reason).toContain("Requires 1 prestige");
    });

    it("should block purchase without prerequisite upgrades", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 3;

      const result = metaSlice.canPurchaseUpgrade("swarm.specialistSeed");
      expect(result.canPurchase).toBe(false);
      expect(result.reason).toContain("Requires");
    });

    it("should allow purchase when all requirements are met", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 3;
      metaSlice.purchasedUpgrades = ["swarm.congestionAwareness", "swarm.predictiveHauling"];

      const result = metaSlice.canPurchaseUpgrade("swarm.specialistSeed");
      expect(result.canPurchase).toBe(true);
    });

    it("should block purchase if already purchased", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 0;
      metaSlice.purchasedUpgrades = ["swarm.congestionAwareness"];

      const result = metaSlice.canPurchaseUpgrade("swarm.congestionAwareness");
      expect(result.canPurchase).toBe(false);
      expect(result.reason).toBe("Already purchased");
    });
  });

  describe("Upgrade Effects Application", () => {
    it("should apply swarm upgrade effects correctly", () => {
      metaSlice.compileShardsBanked = 10;
      metaSlice.totalPrestiges = 0;

      const success = metaSlice.purchaseUpgrade("swarm.congestionAwareness");
      expect(success).toBe(true);
      expect(metaSlice.swarmCognition.congestionAvoidanceLevel).toBe(1);
      expect(metaSlice.compileShardsBanked).toBe(5); // 10 - 5
      expect(metaSlice.purchasedUpgrades).toContain("swarm.congestionAwareness");
    });

    it("should apply bio upgrade effects correctly", () => {
      metaSlice.compileShardsBanked = 20;
      metaSlice.totalPrestiges = 0;

      const success = metaSlice.purchaseUpgrade("bio.preGrownTissue");
      expect(success).toBe(true);
      expect(metaSlice.bioStructure.startingRadius).toBe(6);
      expect(metaSlice.compileShardsBanked).toBe(15); // 20 - 5
    });

    it("should apply compiler upgrade effects correctly", () => {
      metaSlice.compileShardsBanked = 10;
      metaSlice.totalPrestiges = 0;

      const success = metaSlice.purchaseUpgrade("compiler.yieldMult");
      expect(success).toBe(true);
      expect(metaSlice.compilerOptimization.compileYieldMult).toBe(1.2);
      expect(metaSlice.compileShardsBanked).toBe(5); // 10 - 5
    });

    it("should accumulate specialist drones correctly", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 3;
      metaSlice.purchasedUpgrades = ["swarm.congestionAwareness", "swarm.predictiveHauling"];

      expect(metaSlice.swarmCognition.startingSpecialists.hauler).toBe(0);
      
      metaSlice.purchaseUpgrade("swarm.specialistSeed");
      
      expect(metaSlice.swarmCognition.startingSpecialists.hauler).toBe(1);
      expect(metaSlice.swarmCognition.startingSpecialists.builder).toBe(1);
      expect(metaSlice.swarmCognition.startingSpecialists.maintainer).toBe(1);
    });

    it("should handle starting core inventory correctly", () => {
      metaSlice.compileShardsBanked = 100;
      metaSlice.totalPrestiges = 5;
      metaSlice.purchasedUpgrades = ["bio.preGrownTissue", "bio.hardenedCoolingVeins", "bio.preInfusedExtractor"];

      metaSlice.purchaseUpgrade("bio.seedStockpile");

      expect(metaSlice.bioStructure.startingCoreInventory.Components).toBe(20);
      expect(metaSlice.bioStructure.startingCoreInventory.TissueMass).toBe(10);
    });
  });

  describe("Upgrade Tree Progression", () => {
    it("should support full swarm cognition tree progression", () => {
      metaSlice.compileShardsBanked = 200;
      metaSlice.totalPrestiges = 6;

      // Tier 1
      expect(metaSlice.purchaseUpgrade("swarm.congestionAwareness")).toBe(true);
      expect(metaSlice.compileShardsBanked).toBe(195);

      // Tier 2
      expect(metaSlice.purchaseUpgrade("swarm.predictiveHauling")).toBe(true);
      expect(metaSlice.compileShardsBanked).toBe(180);

      // Tier 3
      expect(metaSlice.purchaseUpgrade("swarm.specialistSeed")).toBe(true);
      expect(metaSlice.compileShardsBanked).toBe(140);

      // Tier 4
      expect(metaSlice.purchaseUpgrade("swarm.coordinatedDispatch")).toBe(true);
      expect(metaSlice.compileShardsBanked).toBe(40);

      expect(metaSlice.swarmCognition.multiDropUnlocked).toBe(true);
    });

    it("should support full bio structure tree progression", () => {
      metaSlice.compileShardsBanked = 200;
      metaSlice.totalPrestiges = 5;

      metaSlice.purchaseUpgrade("bio.preGrownTissue");
      metaSlice.purchaseUpgrade("bio.hardenedCoolingVeins");
      metaSlice.purchaseUpgrade("bio.preInfusedExtractor");
      metaSlice.purchaseUpgrade("bio.seedStockpile");

      expect(metaSlice.compileShardsBanked).toBe(40); // 200 - 5 - 15 - 40 - 100
      expect(metaSlice.bioStructure.startingRadius).toBe(6);
      expect(metaSlice.bioStructure.passiveCoolingBonus).toBe(1);
      expect(metaSlice.bioStructure.startingExtractorTier).toBe(2);
    });

    it("should support full compiler optimization tree progression", () => {
      metaSlice.compileShardsBanked = 200;
      metaSlice.totalPrestiges = 7;

      metaSlice.purchaseUpgrade("compiler.yieldMult");
      metaSlice.purchaseUpgrade("compiler.thermalOverdriveTuning");
      metaSlice.purchaseUpgrade("compiler.efficientRecycling");
      metaSlice.purchaseUpgrade("compiler.recursiveCompilePath");

      expect(metaSlice.compileShardsBanked).toBe(40); // 200 - 5 - 15 - 40 - 100
      expect(metaSlice.compilerOptimization.compileYieldMult).toBe(1.2);
      expect(metaSlice.compilerOptimization.overclockEfficiencyBonus).toBe(1);
      expect(metaSlice.compilerOptimization.recycleBonus).toBe(0.3);
      expect(metaSlice.compilerOptimization.startingForkPoints).toBe(1);
    });
  });

  describe("getAvailableUpgrades", () => {
    it("should return all upgrades for swarm cognition tree", () => {
      const upgrades = metaSlice.getAvailableUpgrades("swarmCognition");
      expect(upgrades).toHaveLength(4);
      expect(upgrades[0].id).toBe("swarm.congestionAwareness");
    });

    it("should return all upgrades for bio structure tree", () => {
      const upgrades = metaSlice.getAvailableUpgrades("bioStructure");
      expect(upgrades).toHaveLength(4);
      expect(upgrades[0].id).toBe("bio.preGrownTissue");
    });

    it("should return all upgrades for compiler optimization tree", () => {
      const upgrades = metaSlice.getAvailableUpgrades("compilerOptimization");
      expect(upgrades).toHaveLength(4);
      expect(upgrades[0].id).toBe("compiler.yieldMult");
    });
  });
});
