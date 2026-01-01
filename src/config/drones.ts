export type DronesConfig = {
  startHeightBase: number;
  startHeightRandom: number;
  baseMoveSpeed: number;
  moveSpeedPerLevel: number;
  baseMineDuration: number;
  mineDurationReductionPerLevel: number;
  minMineDuration: number;
  baseCargo: number;
  cargoPerLevel: number;
  haulers: {
    baseSpeed: number;
    speedPerLevel: number;
    baseCargo: number;
    cargoPerLevel: number;
  };
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
  useGLBMesh: boolean;
  glbPath: string;
};

export const defaultDronesConfig: DronesConfig = {
  startHeightBase: 15,
  startHeightRandom: 5,
  baseMoveSpeed: 5,
  moveSpeedPerLevel: 2,
  baseMineDuration: 2.0,
  mineDurationReductionPerLevel: 0.2,
  minMineDuration: 0.2,
  baseCargo: 10,
  cargoPerLevel: 2,
  haulers: {
    baseSpeed: 10,
    speedPerLevel: 2,
    baseCargo: 50,
    cargoPerLevel: 10,
  },
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
  useGLBMesh: true,
  glbPath: `${import.meta.env.BASE_URL}assets/glb/drone/drone_compressed.glb`.replace(
    /\/\//g,
    "/",
  ),
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

export const getDroneCargo = (level: number, cfg?: Config) => {
  if (!cfg) throw new Error("getDroneCargo: cfg is required");
  return Math.floor(cfg.drones.baseCargo + level * cfg.drones.cargoPerLevel);
};

export default defaultDronesConfig;
