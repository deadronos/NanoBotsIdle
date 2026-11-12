import { type InstancedMesh, type Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

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
  public instanceColor: {
    count?: number;
    needsUpdate: boolean;
    addUpdateRange: (s: number, c: number) => void;
  } | null = { count: 32, needsUpdate: false, addUpdateRange: vi.fn() };
  public material = new MockMaterial();

  public setMatrixAt = vi.fn();
  public setColorAt = vi.fn();
}

describe("droneVisuals performance optimization", () => {
  it.each([1, -1])(
    "faces the direction of flight and holds its heading at the dock (nose sign %i)",
    (noseSign) => {
      const body = new MockInstancedMesh();
      body.userData.noseAxisSign = noseSign;
      let bodyMatrix: Matrix4;
      body.setMatrixAt.mockImplementation((_index: number, matrix: Matrix4) => {
        bodyMatrix = matrix.clone();
      });
      const beam = new MockInstancedMesh();
      const scan = new MockInstancedMesh();
      const box = new MockInstancedMesh();
      const positions = new Float32Array([0, 10, 0]);
      const targets = new Float32Array([NaN, NaN, NaN]);
      const states = new Uint8Array([DRONE_STATE_ID.RETURNING]);
      const render = () =>
        updateDroneInstancedVisuals(
          getConfig(),
          1,
          positions,
          targets,
          states,
          null,
          null,
          body as unknown as InstancedMesh,
          beam as unknown as InstancedMesh,
          scan as unknown as InstancedMesh,
          box as unknown as InstancedMesh,
          0,
        );
      const nose = () => new Vector3(0, noseSign, 0).transformDirection(bodyMatrix);

      render();
      expect(nose().y).toBeCloseTo(0);
      positions[0] = -2;
      render();
      expect(nose().x).toBeCloseTo(-1);
      states[0] = DRONE_STATE_ID.DEPOSITING;
      render();
      expect(nose().x).toBeCloseTo(-1);
    },
  );

  it("renders the drone body at the configured body scale", () => {
    const cfg = getConfig();
    const body = new MockInstancedMesh();
    let bodyMatrix: Matrix4 | undefined;
    body.setMatrixAt.mockImplementation((_index: number, matrix: Matrix4) => {
      bodyMatrix = matrix.clone();
    });
    updateDroneInstancedVisuals(
      cfg,
      1,
      new Float32Array([0, 10, 0]),
      new Float32Array([NaN, NaN, NaN]),
      new Uint8Array([DRONE_STATE_ID.RETURNING]),
      null,
      null,
      body as unknown as InstancedMesh,
      new MockInstancedMesh() as unknown as InstancedMesh,
      new MockInstancedMesh() as unknown as InstancedMesh,
      new MockInstancedMesh() as unknown as InstancedMesh,
      0,
    );
    const scale = new Vector3();
    bodyMatrix!.decompose(new Vector3(), new Quaternion(), scale);
    expect(cfg.drones.visual.bodyScale).toBeLessThan(1);
    expect(scale.x).toBeCloseTo(cfg.drones.visual.bodyScale);
  });

  it("keeps body colors stable until roles change", () => {
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
    const roles = new Uint8Array([0, 1]);

    const bodyMesh = new MockInstancedMesh();
    const miningLaserMesh = new MockInstancedMesh();
    const scanningLaserMesh = new MockInstancedMesh();
    const targetBoxMesh = new MockInstancedMesh();
    bodyMesh.instanceColor = { count: 32, needsUpdate: false, addUpdateRange: vi.fn() };
    targetBoxMesh.instanceColor = null;

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

    expect(bodyMesh.setColorAt).toHaveBeenCalledTimes(2);
    bodyMesh.setColorAt.mockClear();

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
      0.016,
    );

    expect(bodyMesh.setColorAt).not.toHaveBeenCalled();

    roles[0] = 1;

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
      0.032,
    );

    expect(bodyMesh.setColorAt).toHaveBeenCalledTimes(1);
  });

  it("updates target-box colors when the drone starts mining", () => {
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
    targetBoxMesh.instanceColor = { count: 32, needsUpdate: false, addUpdateRange: vi.fn() };

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

    expect(targetBoxMesh.setColorAt).toHaveBeenCalledTimes(1);
    targetBoxMesh.setColorAt.mockClear();

    states[0] = DRONE_STATE_ID.MINING;

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
      0.016,
    );

    expect(targetBoxMesh.setColorAt).toHaveBeenCalledTimes(1);
  });
});
