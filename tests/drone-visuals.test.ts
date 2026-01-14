import type { InstancedMesh } from "three";
import { describe, expect, it, vi } from "vitest";

import { updateDroneVisuals } from "../src/components/drones/droneVisuals";
import { getConfig } from "../src/config/index";
import { DRONE_STATE_ID } from "../src/shared/droneState";

class MockMaterial {
  public opacity = 0.5;
}

class MockInstancedMesh {
  public count = 0;
  public userData: Record<string, unknown> = {};
  public instanceMatrix = { count: 32, needsUpdate: false };
  public instanceColor: { count?: number; needsUpdate: boolean } | null = { needsUpdate: false };
  public material = new MockMaterial();

  public setMatrixAt = vi.fn();
  public setColorAt = vi.fn();
}

describe("droneVisuals performance optimization (TDD)", () => {
  it("should not call setColorAt when role hasn't changed", () => {
    const cfg = getConfig();
    const droneCount = 2;
    const positions = new Float32Array([0, 10, 0, 5, 10, 5]);
    const targets = new Float32Array([
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
      Number.NaN,
    ]);
    const states = new Uint8Array([DRONE_STATE_ID.SEEKING, DRONE_STATE_ID.SEEKING]);
    const roles = new Uint8Array([0, 1]); // miner, hauler

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();

    // Enable instance colors on body only for this test.
    bodyMesh.instanceColor = { needsUpdate: false };
    targetBoxMesh.instanceColor = null;

    // First frame - should set colors
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0,
    );

    expect(bodyMesh.setColorAt).toHaveBeenCalledTimes(2);
    bodyMesh.setColorAt.mockClear();

    // Second frame - should NOT call setColorAt again (same roles)
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0.016,
    );

    expect(bodyMesh.setColorAt).not.toHaveBeenCalled();
  });

  it("should call setColorAt when role changes", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([Number.NaN, Number.NaN, Number.NaN]);
    const states = new Uint8Array([DRONE_STATE_ID.SEEKING]);
    const roles = new Uint8Array([0]); // miner

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();

    bodyMesh.instanceColor = { needsUpdate: false };
    targetBoxMesh.instanceColor = null;

    // First frame - miner
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0,
    );

    expect(bodyMesh.setColorAt).toHaveBeenCalledTimes(1);
    bodyMesh.setColorAt.mockClear();

    // Change role to hauler
    roles[0] = 1;

    // Second frame - should detect role change and update color
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0.016,
    );

    expect(bodyMesh.setColorAt).toHaveBeenCalledTimes(1);
  });

  it("should not update opacity every frame for mining laser when value is stable", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]); // has target
    const states = new Uint8Array([DRONE_STATE_ID.MINING]);
    const roles = new Uint8Array([0]);

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();

    // Set initial opacity
    miningLaserMesh.material.opacity = cfg.drones.visual.miningLaser.opacityBase;
    bodyMesh.instanceColor = null;
    targetBoxMesh.instanceColor = null;

    // First frame at time = 0
    const time1 = 0;
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      time1,
    );

    const opacity1 = miningLaserMesh.material.opacity;

    // Second frame at same time (simulating redundant update) - opacity should not change
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      time1,
    );

    const opacity2 = miningLaserMesh.material.opacity;

    // Opacity should remain the same between identical frames
    expect(opacity2).toBe(opacity1);
  });

  it("should not call setColorAt on targetBox when state hasn't changed", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]);
    const states = new Uint8Array([DRONE_STATE_ID.MOVING]);
    const roles = new Uint8Array([0]);

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();
    bodyMesh.instanceColor = null;
    targetBoxMesh.instanceColor = { needsUpdate: false };

    // First frame - moving state
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0,
    );

    expect(targetBoxMesh.setColorAt).toHaveBeenCalledTimes(1);
    targetBoxMesh.setColorAt.mockClear();

    // Second frame - still moving, color should not change
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0.016,
    );

    expect(targetBoxMesh.setColorAt).not.toHaveBeenCalled();
  });

  it("should call setColorAt on targetBox when state changes from moving to mining", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 10]);
    const states = new Uint8Array([DRONE_STATE_ID.MOVING]);
    const roles = new Uint8Array([0]);

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();
    bodyMesh.instanceColor = null;
    targetBoxMesh.instanceColor = { needsUpdate: false };

    // First frame - moving state
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0,
    );

    expect(targetBoxMesh.setColorAt).toHaveBeenCalledTimes(1);
    targetBoxMesh.setColorAt.mockClear();

    // Change state to mining
    states[0] = DRONE_STATE_ID.MINING;

    // Second frame - mining state
    updateDroneVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0.016,
    );

    expect(targetBoxMesh.setColorAt).toHaveBeenCalledTimes(1);
  });
});
