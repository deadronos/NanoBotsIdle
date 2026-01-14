import { describe, expect, it } from "vitest";

import { resetConfig, updateConfig } from "../src/config/index";
import { FrontierManager, type VoxelReader } from "../src/engine/world/FrontierManager";
import { MATERIAL_AIR, MATERIAL_SOLID } from "../src/shared/voxel";
import { getSeed } from "../src/sim/terrain";

// Mock reader that simulates a solid block with air around it, or configurable
class MockVoxelReader implements VoxelReader {
  private map = new Map<string, number>();

  constructor(defaultMat: number = MATERIAL_AIR) {
    this.defaultMat = defaultMat;
  }
  private defaultMat: number;

  set(x: number, y: number, z: number, mat: number) {
    this.map.set(`${x},${y},${z}`, mat);
  }
  materialAt(x: number, y: number, z: number): number {
    return this.map.get(`${x},${y},${z}`) ?? this.defaultMat;
  }
}

describe("FrontierManager", () => {
  it("initializes frontier from surface correctly", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const waterline = -12;
    const manager = new FrontierManager(seed, -50, waterline);

    // Test initialization
    const count = manager.initializeFrontierFromSurface(2); // small radius
    expect(count).toBeGreaterThan(0);
    expect(manager.getFrontierKeys().length).toBeGreaterThan(0);
  });

  it("updates frontier when voxel is mined (exposed to air)", () => {
    resetConfig();
    const seed = getSeed(1);
    const manager = new FrontierManager(seed, -50, -12);
    const reader = new MockVoxelReader(MATERIAL_SOLID);

    // Set up a scenario: 0,0,0 is solid, 1,0,0 is air. So 0,0,0 is frontier.
    reader.set(0, 0, 0, MATERIAL_SOLID);
    reader.set(1, 0, 0, MATERIAL_AIR);

    // Ideally we rely on manager's internal state. But updateFrontierAt updates state based on reader.
    // Let's call updateFrontierAt directly.
    manager.updateFrontierAt(reader, 0, 0, 0);
    expect(manager.hasFrontier(0, 0, 0)).toBe(true);

    // Now fill neighbor with solid
    reader.set(1, 0, 0, MATERIAL_SOLID);
    manager.updateFrontierAt(reader, 0, 0, 0);
    // Should check all neighbors. If all solid, then not frontier.
    // MockVoxelReader defaults to solid? No, in this test I made it default to SOLID.
    // So all neighbors are solid.
    expect(manager.hasFrontier(0, 0, 0)).toBe(false);
  });

  it("counts frontier above water", () => {
    resetConfig();
    const seed = getSeed(1);
    const waterline = 0;
    const manager = new FrontierManager(seed, -50, waterline);
    const reader = new MockVoxelReader(MATERIAL_AIR);

    // 0, 10, 0 -> Solid, Neighbor 1,10,0 -> Air. Above water.
    reader.set(0, 10, 0, MATERIAL_SOLID);
    reader.set(1, 10, 0, MATERIAL_AIR);

    manager.updateFrontierAt(reader, 0, 10, 0);
    expect(manager.countFrontierAboveWater()).toBe(1);

    // 0, -10, 0 -> Solid, Neighbor 1,-10,0 -> Air. Below water.
    reader.set(0, -10, 0, MATERIAL_SOLID);
    reader.set(1, -10, 0, MATERIAL_AIR);

    manager.updateFrontierAt(reader, 0, -10, 0);
    expect(manager.countFrontierAboveWater()).toBe(1); // Still 1 (only the one above water counts)
  });

  it("ensureFrontierInChunk adds frontier columns", () => {
     resetConfig();
     const seed = getSeed(1);
     const manager = new FrontierManager(seed, -50, -12);

     const added = manager.ensureFrontierInChunk(0, 0);
     expect(added).not.toBeNull();
     expect(added?.length).toBeGreaterThan(0);

     // calling again returns null (visited)
     const added2 = manager.ensureFrontierInChunk(0, 0);
     expect(added2).toBeNull();
  });
});
