import type { Vector3 } from "three";

import type { Config } from "../../config/index";
import { updateDroneInstancedVisuals } from "./droneInstancedVisuals";
import { consumeMinedEffects } from "./minedEffects";
import type { DroneEffectRefs, DroneVisualRefs } from "./types";

export const updateDronesFrame = (options: {
  cfg: Config;
  droneCount: number;
  positions: Float32Array;
  targets: Float32Array;
  states: Uint8Array;
  roles: Uint8Array | null;
  refs: DroneVisualRefs;
  effects: DroneEffectRefs;
  elapsedTime: number;
  minedPositions: Float32Array | null;
  tempWorldTarget: Vector3;
}) => {
  const bodyMesh = options.refs.bodyMesh;
  const miningLaserMesh = options.refs.miningLaserMesh;
  const scanningLaserMesh = options.refs.scanningLaserMesh;
  const targetBoxMesh = options.refs.targetBoxMesh;

  if (bodyMesh && miningLaserMesh && scanningLaserMesh && targetBoxMesh) {
    updateDroneInstancedVisuals(
      options.cfg,
      options.droneCount,
      options.positions,
      options.targets,
      options.states,
      options.roles,
      bodyMesh,
      miningLaserMesh,
      scanningLaserMesh,
      targetBoxMesh,
      options.elapsedTime,
    );
  }

  return consumeMinedEffects({
    cfg: options.cfg,
    minedPositions: options.minedPositions,
    effects: options.effects,
    tempWorldTarget: options.tempWorldTarget,
  });
};
