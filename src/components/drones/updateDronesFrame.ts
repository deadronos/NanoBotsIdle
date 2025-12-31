import type { RootState } from "@react-three/fiber";
import type { Vector3 } from "three";

import type { Config } from "../../config/index";
import { updateDroneVisuals } from "./droneVisuals";
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
  tempWorldTarget: Vector3;
  tempLocalTarget: Vector3;
  frameState: RootState;
  minedPositions: Float32Array | null;
}) => {
  updateDroneVisuals({
    cfg: options.cfg,
    droneCount: options.droneCount,
    positions: options.positions,
    targets: options.targets,
    states: options.states,
    roles: options.roles,
    refs: options.refs,
    tempWorldTarget: options.tempWorldTarget,
    tempLocalTarget: options.tempLocalTarget,
    elapsedTime: options.frameState.clock.elapsedTime,
  });

  return consumeMinedEffects({
    cfg: options.cfg,
    minedPositions: options.minedPositions,
    effects: options.effects,
    tempWorldTarget: options.tempWorldTarget,
  });
};
