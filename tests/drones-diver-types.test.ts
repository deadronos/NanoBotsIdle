import { describe, expect, test } from "vitest";

import { getConfig } from "../src/config/index";
import type { DroneRole } from "../src/engine/drones";

describe("DIVER drone role - Type System", () => {
  test("DIVER role exists as valid DroneRole", () => {
    // Red: This will fail until we add DIVER to the type
    const role: DroneRole = "DIVER";
    expect(role).toBe("DIVER");
  });

  test("divers config exists with required fields", () => {
    const cfg = getConfig();
    
    expect(cfg.drones.divers).toBeDefined();
    expect(cfg.drones.divers.baseSpeed).toBeGreaterThan(0);
    expect(cfg.drones.divers.speedPerLevel).toBeGreaterThan(0);
    expect(cfg.drones.divers.underwaterSpeedMultiplier).toBeGreaterThan(0);
    expect(cfg.drones.divers.underwaterSpeedMultiplier).toBeLessThanOrEqual(1);
    expect(cfg.drones.divers.baseCargo).toBeGreaterThan(0);
    expect(cfg.drones.divers.cargoPerLevel).toBeGreaterThan(0);
    expect(cfg.drones.divers.maxDepth).toBeLessThan(0); // Negative (below water)
  });

  test("diver cost exists in economy config", () => {
    const cfg = getConfig();
    
    expect(cfg.economy.baseCosts.diver).toBeDefined();
    expect(cfg.economy.baseCosts.diver).toBeGreaterThan(0);
    // Should be more expensive than miners but reasonable
    expect(cfg.economy.baseCosts.diver).toBeGreaterThan(cfg.economy.baseCosts.drone);
    expect(cfg.economy.baseCosts.diver).toBeLessThan(cfg.economy.baseCosts.hauler * 2);
  });
});
