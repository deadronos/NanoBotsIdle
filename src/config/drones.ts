export type DronesConfig = {
  startHeightBase: number;
  startHeightRandom: number;
  baseMoveSpeed: number;
  moveSpeedPerLevel: number;
  baseMineDuration: number;
  mineDurationReductionPerLevel: number;
  minMineDuration: number;
  particle: {
    maxParticles: number;
    spread: number;
    maxVelocity: number;
    upBiasBase: number;
    lifeBase: number;
    lifeRandom: number;
    scaleBase: number;
    scaleRandom: number;
    gravity: number;
    burstCount: number;
  };
  visual: {
    miningLaser: {
      baseWidth: number;
      jitterAmplitude: number;
      opacityBase: number;
      opacityFreq: number;
    };
    scanningLaser: {
      opacityBase: number;
      opacityAmplitude: number;
      opacityFreq: number;
    };
    targetBox: {
      baseScale: number;
      pulseAmplitude: number;
      pulseFreq: number;
    };
    bobbing: {
      speed: number;
      amplitude: number;
    };
    impactLight: {
      baseIntensity: number;
      randomIntensity: number;
    };
  };
};

export const defaultDronesConfig: DronesConfig = {
  startHeightBase: 15,
  startHeightRandom: 5,
  baseMoveSpeed: 5,
  moveSpeedPerLevel: 2,
  baseMineDuration: 2.0,
  mineDurationReductionPerLevel: 0.2,
  minMineDuration: 0.2,
  particle: {
    maxParticles: 400,
    spread: 0.8,
    maxVelocity: 4,
    upBiasBase: 2,
    lifeBase: 0.5,
    lifeRandom: 0.5,
    scaleBase: 0.2,
    scaleRandom: 0.2,
    gravity: 15,
    burstCount: 8,
  },
  visual: {
    miningLaser: {
      baseWidth: 1,
      jitterAmplitude: 0.3,
      opacityBase: 0.5,
      opacityFreq: 30,
    },
    scanningLaser: {
      opacityBase: 0.2,
      opacityAmplitude: 0.1,
      opacityFreq: 10,
    },
    targetBox: {
      baseScale: 1.05,
      pulseAmplitude: 0.05,
      pulseFreq: 8,
    },
    bobbing: {
      speed: 5,
      amplitude: 0.01,
    },
    impactLight: {
      baseIntensity: 2,
      randomIntensity: 3,
    },
  },
};

import type { Config } from "./index";

export const getDroneMoveSpeed = (level: number, cfg?: Config) => {
  if (!cfg) throw new Error("getDroneMoveSpeed: cfg is required (pass getConfig())");
  return cfg.drones.baseMoveSpeed + level * cfg.drones.moveSpeedPerLevel;
};

export const getMineDuration = (level: number, cfg?: Config) => {
  if (!cfg) throw new Error("getMineDuration: cfg is required (pass getConfig())");
  return Math.max(
    cfg.drones.minMineDuration,
    cfg.drones.baseMineDuration - level * cfg.drones.mineDurationReductionPerLevel,
  );
};

export default defaultDronesConfig;
