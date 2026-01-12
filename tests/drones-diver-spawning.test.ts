import { describe, expect, test } from "vitest";

import { getConfig } from "../src/config/index";
import { syncDroneCount, type Drone } from "../src/engine/drones";

describe("DIVER drone role - Spawning & Management", () => {
  test("syncDroneCount accepts diverCount parameter", () => {
    const cfg = getConfig();
    const drones: Drone[] = [];
    
    const result = syncDroneCount(drones, 0, 0, 1, cfg);
    
    expect(result.length).toBe(1);
    expect(result[0].role).toBe("DIVER");
  });

  test("DIVERs spawn at underwater positions", () => {
    const cfg = getConfig();
    const drones: Drone[] = [];
    
    const result = syncDroneCount(drones, 0, 0, 3, cfg);
    
    const divers = result.filter(d => d.role === "DIVER");
    expect(divers.length).toBe(3);
    
    // All divers should spawn below water level
    divers.forEach(diver => {
      expect(diver.y).toBeLessThan(cfg.terrain.waterLevel);
    });
  });

  test("DIVERs initialized with correct config values", () => {
    const cfg = getConfig();
    const drones: Drone[] = [];
    
    const result = syncDroneCount(drones, 0, 0, 1, cfg);
    const diver = result[0];
    
    expect(diver.role).toBe("DIVER");
    expect(diver.state).toBe("SEEKING");
    expect(diver.payload).toBe(0);
    expect(diver.maxPayload).toBe(cfg.drones.divers.baseCargo);
  });

  test("syncDroneCount manages mixed drone types correctly", () => {
    const cfg = getConfig();
    const drones: Drone[] = [];
    
    // Create 2 miners, 1 hauler, 2 divers
    const result = syncDroneCount(drones, 2, 1, 2, cfg);
    
    expect(result.length).toBe(5);
    expect(result.filter(d => d.role === "MINER").length).toBe(2);
    expect(result.filter(d => d.role === "HAULER").length).toBe(1);
    expect(result.filter(d => d.role === "DIVER").length).toBe(2);
  });

  test("syncDroneCount removes excess DIVERs when count decreases", () => {
    const cfg = getConfig();
    
    // Start with 3 divers
    let drones = syncDroneCount([], 0, 0, 3, cfg);
    expect(drones.filter(d => d.role === "DIVER").length).toBe(3);
    
    // Reduce to 1 diver
    drones = syncDroneCount(drones, 0, 0, 1, cfg);
    expect(drones.filter(d => d.role === "DIVER").length).toBe(1);
  });
});
