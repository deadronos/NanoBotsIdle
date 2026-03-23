import { describe, expect, it, vi } from "vitest";
import type { InstancedMesh } from "three";
import { updateDroneInstancedVisuals } from "../src/components/drones/droneInstancedVisuals";
import { getConfig } from "../src/config/index";
import { DRONE_STATE_ID } from "../src/shared/droneState";

class MockMaterial {
  public opacity = 0.5;
}

class MockInstancedMesh {
  public count = 0;
  public userData: Record<string, unknown> = {};
  public instanceMatrix = { count: 32, needsUpdate: false, addUpdateRange: vi.fn() };
  public instanceColor: { count?: number; needsUpdate: boolean; addUpdateRange: (s: number, c: number) => void } | null = { count: 32, needsUpdate: false, addUpdateRange: vi.fn() };
  public material = new MockMaterial();

  public setMatrixAt = vi.fn();
  public setColorAt = vi.fn();
}

describe("droneVisuals performance optimization", () => {
  it("should run without crashing", () => {
    const cfg = getConfig();
    const droneCount = 1;
    const positions = new Float32Array([0, 10, 0]);
    const targets = new Float32Array([0, 0, 0]);
    const states = new Uint8Array([DRONE_STATE_ID.SEEKING]);
    const roles = new Uint8Array([0]);

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();

    updateDroneInstancedVisuals(
      cfg,
      droneCount,
      positions,
      targets,
      states,
      null,
      roles,
      bodyMesh as unknown as InstancedMesh,
      miningLaserMesh as unknown as InstancedMesh,
      scanningLaserMesh as unknown as InstancedMesh,
      targetBoxMesh as unknown as InstancedMesh,
      0,
    );

    expect(bodyMesh.setMatrixAt).toHaveBeenCalled();
  });
});
