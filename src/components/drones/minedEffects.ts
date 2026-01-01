import type { Vector3 } from "three";
import { Color } from "three";

import type { Config } from "../../config/index";
import { getVoxelColor } from "../../utils";
import type { DroneEffectRefs } from "./types";

const _tmpColor = new Color();

export const consumeMinedEffects = (options: {
  cfg: Config;
  minedPositions: Float32Array | null;
  effects: DroneEffectRefs;
  tempWorldTarget: Vector3;
}) => {
  const { cfg, minedPositions, effects, tempWorldTarget } = options;
  if (!minedPositions || minedPositions.length === 0) return false;

  for (let i = 0; i < minedPositions.length; i += 3) {
    tempWorldTarget.set(minedPositions[i], minedPositions[i + 1], minedPositions[i + 2]);
    const blockColor = getVoxelColor(tempWorldTarget.y);
    _tmpColor.setHex(blockColor);
    effects.flash?.trigger(tempWorldTarget);
    if (effects.particles) {
      for (let j = 0; j < cfg.drones.particle.burstCount; j += 1) {
        effects.particles.spawn(tempWorldTarget, _tmpColor);
      }
    }
  }

  return true;
};
