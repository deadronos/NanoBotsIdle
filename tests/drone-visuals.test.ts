import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { updateDroneVisuals } from "../src/components/drones/droneVisuals";
import type { DroneVisualRefs } from "../src/components/drones/types";
import { getConfig } from "../src/config/index";
import { DRONE_STATE_ID } from "../src/shared/droneState";

/**
 * Mock Material with tracking for performance optimization validation
 */
class MockMaterial {
  public color = {
    _hex: 0x000000, // Start with black (no role color)
    setHex: vi.fn((hex: number) => {
      this.color._hex = hex;
    }),
    getHex: vi.fn(() => this.color._hex),
  };
  public opacity = 0.5;
}

/**
 * Mock Mesh with material tracking
 */
class MockMesh {
  public material = new MockMaterial();
  public visible = false;
  public position = new Vector3();
  public scale = new Vector3(1, 1, 1);
  public rotation = new Vector3();

  lookAt = vi.fn();
}

/**
 * Mock Group for drone representation
 */
class MockGroup {
  public position = new Vector3();
  public rotation = new Vector3();

  lookAt = vi.fn();
  worldToLocal = vi.fn((v: Vector3) => v.clone());
}

describe("droneVisuals performance optimization (TDD)", () => {
  it("should not call setHex when color hasn't changed for same role", () => {
    const cfg = getConfig();
    const droneCount = 2;
    const positions = new Float32Array([0, 10, 0, 5, 10, 5]);
    const targets = new Float32Array([0, 0, 0, 0, 0, 0]);
    const states = new Uint8Array([DRONE_STATE_ID.SEEKING, DRONE_STATE_ID.SEEKING]);
    const roles = new Uint8Array([0, 1]); // miner, hauler

    const group0 = new MockGroup();
    const body0 = new MockMesh();
    const group1 = new MockGroup();
    const body1 = new MockMesh();

    const refs: DroneVisualRefs = {
      groupRefs: [group0 as unknown as Group, group1 as unknown as Group],
      bodyRefs: [body0 as unknown as Mesh, body1 as unknown as Mesh],
      miningLaserRefs: [null, null],
      scanningLaserRefs: [null, null],
      targetBoxRefs: [null, null],
      impactLightRefs: [null, null],
    };

    const tempWorldTarget = new Vector3();
    const tempLocalTarget = new Vector3();

    // First frame - should set colors
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0,
    });

    expect(body0.material.color.setHex).toHaveBeenCalledTimes(1);
    expect(body0.material.color.setHex).toHaveBeenCalledWith(0x00ffcc); // miner
    expect(body1.material.color.setHex).toHaveBeenCalledTimes(1);
    expect(body1.material.color.setHex).toHaveBeenCalledWith(0xffaa00); // hauler

    // Reset mocks
    body0.material.color.setHex.mockClear();
    body1.material.color.setHex.mockClear();

    // Second frame - should NOT call setHex again (same roles, colors already set)
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0.016,
    });

    expect(body0.material.color.setHex).not.toHaveBeenCalled();
    expect(body1.material.color.setHex).not.toHaveBeenCalled();
  });

  it("should call setHex when role changes", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 0]);
    const states = new Uint8Array([DRONE_STATE_ID.SEEKING]);
    const roles = new Uint8Array([0]); // miner

    const group = new MockGroup();
    const body = new MockMesh();

    const refs: DroneVisualRefs = {
      groupRefs: [group as unknown as Group],
      bodyRefs: [body as unknown as Mesh],
      miningLaserRefs: [null],
      scanningLaserRefs: [null],
      targetBoxRefs: [null],
      impactLightRefs: [null],
    };

    const tempWorldTarget = new Vector3();
    const tempLocalTarget = new Vector3();

    // First frame - miner
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0,
    });

    expect(body.material.color.setHex).toHaveBeenCalledWith(0x00ffcc);
    body.material.color.setHex.mockClear();

    // Change role to hauler
    roles[0] = 1;

    // Second frame - should detect role change and update color
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0.016,
    });

    expect(body.material.color.setHex).toHaveBeenCalledTimes(1);
    expect(body.material.color.setHex).toHaveBeenCalledWith(0xffaa00);
  });

  it("should not update opacity every frame for mining laser when value is stable", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]); // has target
    const states = new Uint8Array([DRONE_STATE_ID.MINING]);
    const roles = new Uint8Array([0]);

    const group = new MockGroup();
    const body = new MockMesh();
    const miningLaser = new MockMesh();
    // Set initial opacity
    miningLaser.material.opacity = cfg.drones.visual.miningLaser.opacityBase;

    const refs: DroneVisualRefs = {
      groupRefs: [group as unknown as Group],
      bodyRefs: [body as unknown as Mesh],
      miningLaserRefs: [miningLaser as unknown as Mesh],
      scanningLaserRefs: [null],
      targetBoxRefs: [null],
      impactLightRefs: [null],
    };

    const tempWorldTarget = new Vector3();
    const tempLocalTarget = new Vector3();

    // First frame at time = 0
    const time1 = 0;
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: time1,
    });

    const opacity1 = miningLaser.material.opacity;

    // Second frame at same time (simulating redundant update) - opacity should not change
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: time1,
    });

    const opacity2 = miningLaser.material.opacity;

    // Opacity should remain the same between identical frames
    expect(opacity2).toBe(opacity1);
  });

  it("should not call setHex on targetBox when state hasn't changed", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]);
    const states = new Uint8Array([DRONE_STATE_ID.MOVING]);
    const roles = new Uint8Array([0]);

    const group = new MockGroup();
    const body = new MockMesh();
    const targetBox = new MockMesh();

    const refs: DroneVisualRefs = {
      groupRefs: [group as unknown as Group],
      bodyRefs: [body as unknown as Mesh],
      miningLaserRefs: [null],
      scanningLaserRefs: [null],
      targetBoxRefs: [targetBox as unknown as Mesh],
      impactLightRefs: [null],
    };

    const tempWorldTarget = new Vector3();
    const tempLocalTarget = new Vector3();

    // First frame - moving state
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0,
    });

    expect(targetBox.material.color.setHex).toHaveBeenCalledWith(0x00ffff); // cyan for moving
    targetBox.material.color.setHex.mockClear();

    // Second frame - still moving, color should not change
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0.016,
    });

    expect(targetBox.material.color.setHex).not.toHaveBeenCalled();
  });

  it("should call setHex on targetBox when state changes from moving to mining", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]);
    const states = new Uint8Array([DRONE_STATE_ID.MOVING]);
    const roles = new Uint8Array([0]);

    const group = new MockGroup();
    const body = new MockMesh();
    const targetBox = new MockMesh();

    const refs: DroneVisualRefs = {
      groupRefs: [group as unknown as Group],
      bodyRefs: [body as unknown as Mesh],
      miningLaserRefs: [null],
      scanningLaserRefs: [null],
      targetBoxRefs: [targetBox as unknown as Mesh],
      impactLightRefs: [null],
    };

    const tempWorldTarget = new Vector3();
    const tempLocalTarget = new Vector3();

    // First frame - moving state
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0,
    });

    expect(targetBox.material.color.setHex).toHaveBeenCalledWith(0x00ffff);
    targetBox.material.color.setHex.mockClear();

    // Change state to mining
    states[0] = DRONE_STATE_ID.MINING;

    // Second frame - mining state
    updateDroneVisuals({
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      refs,
      tempWorldTarget,
      tempLocalTarget,
      elapsedTime: 0.016,
    });

    expect(targetBox.material.color.setHex).toHaveBeenCalledTimes(1);
    expect(targetBox.material.color.setHex).toHaveBeenCalledWith(0xff3333); // red for mining
  });
});
