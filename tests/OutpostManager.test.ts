import { describe, expect, it } from "vitest";

import { OutpostManager } from "../src/engine/world/OutpostManager";

describe("OutpostManager", () => {
  it("adds and retrieves outposts", () => {
    const manager = new OutpostManager();
    expect(manager.getOutposts().length).toBe(0);

    manager.addOutpost(10, 20, 30);
    expect(manager.getOutposts().length).toBe(1);
    const op = manager.getOutposts()[0];
    expect(op.x).toBe(10);
    expect(op.y).toBe(20);
    expect(op.z).toBe(30);
  });

  it("finds nearest outpost", () => {
    const manager = new OutpostManager();
    manager.addOutpost(0, 0, 0);
    manager.addOutpost(100, 100, 100);

    const nearest = manager.getNearestOutpost(10, 10, 10);
    expect(nearest).toBeDefined();
    expect(nearest?.x).toBe(0);

    const nearestFar = manager.getNearestOutpost(90, 90, 90);
    expect(nearestFar?.x).toBe(100);
  });

  it("manages docking queue", () => {
    const manager = new OutpostManager();
    manager.addOutpost(0, 0, 0);
    const op = manager.getOutposts()[0];

    // Dock 4 drones (max slots)
    expect(manager.requestDock(op, 1)).toBe("GRANTED");
    expect(manager.requestDock(op, 2)).toBe("GRANTED");
    expect(manager.requestDock(op, 3)).toBe("GRANTED");
    expect(manager.requestDock(op, 4)).toBe("GRANTED");

    // 5th should be queued
    expect(manager.requestDock(op, 5)).toBe("QUEUED");
    expect(manager.getQueueLength(op)).toBe(1);

    // Undock one
    manager.undock(op, 1);

    // Now 5th should be granted if requested again (logic in requestDock checks if queue[0] is droneId)
    // Wait, requestDock checks: if (queue[0] === droneId) ...
    // But queue[0] IS 5.

    expect(manager.requestDock(op, 5)).toBe("GRANTED");
    expect(manager.getQueueLength(op)).toBe(0);
  });

  it("getBestOutpost balances distance and load", () => {
      const manager = new OutpostManager();
      manager.addOutpost(0, 0, 0);   // Close but busy
      manager.addOutpost(100, 0, 0); // Far but empty

      const busyOp = manager.getOutposts()[0];
      const emptyOp = manager.getOutposts()[1];

      // Make busyOp busy
      // Add 20 drones to queue/docked
      for(let i=0; i<20; i++) {
          busyOp.docked.add(i);
      }

      // At 10,0,0
      // Dist to busy = 10. Load score = 20 * 10 = 200. Total = 210.
      // Dist to empty = 90. Load score = 0. Total = 90.
      // Should pick empty.

      const best = manager.getBestOutpost(10, 0, 0);
      expect(best).toBe(emptyOp);
  });
});
