export type SkyConfig = {
  distance: number;
  sunPosition: [number, number, number];
  turbidity: number;
  rayleigh: number;
};

export type SunConfig = {
  position: [number, number, number];
  intensity: number;
  shadowMapSize: [number, number];
  cameraBounds: { left: number; right: number; top: number; bottom: number };
  bias: number;
  normalBias: number;
};

export const voxelRenderModes = ["frontier", "frontier-fill", "dense", "meshed"] as const;

export type VoxelRenderMode = (typeof voxelRenderModes)[number];

export type BloomConfig = {
  enabled: boolean;
  intensity: number;
  /** Only pixels brighter than this bloom; keep >= 1 so only HDR emissives glow. */
  luminanceThreshold: number;
  luminanceSmoothing: number;
};

export type RenderConfig = {
  sky: SkyConfig;
  bloom: BloomConfig;
  ambientLightIntensity: number;
  sun: SunConfig;
  voxels: {
    mode: VoxelRenderMode;
    debugCompare: {
      enabled: boolean;
      radiusChunks: number;
      logIntervalMs: number;
    };
    biomeOverlay: {
      enabled: boolean;
    };
    lod: {
      lowDistanceMultiplier: number;
      hideDistanceMultiplier: number;
      progressive: {
        enabled: boolean;
        refineDelayFrames: number;
      };
    };
    chunkLoad: {
      initialRadius: number;
      initialDims: 2 | 3;
      activeRadius: number;
      activeDims: 2 | 3;
    };
    occlusion: {
      enabled: boolean;
      queryDelayFrames: number;
      maxQueriesPerFrame: number;
    };
  };
};

export const defaultRenderConfig: RenderConfig = {
  sky: {
    distance: 450000,
    sunPosition: [50, 50, 20],
    turbidity: 4,
    rayleigh: 2,
  },
  bloom: {
    enabled: true,
    intensity: 0.9,
    luminanceThreshold: 1,
    luminanceSmoothing: 0.2,
  },
  ambientLightIntensity: 0.65,
  sun: {
    position: [50, 50, 20],
    intensity: 1.5,
    shadowMapSize: [2048, 2048],
    cameraBounds: { left: -50, right: 50, top: 50, bottom: -50 },
    bias: -0.0005,
    normalBias: 0.05,
  },
  voxels: {
    mode: "meshed",
    debugCompare: {
      enabled: false,
      radiusChunks: 1,
      logIntervalMs: 1000,
    },
    biomeOverlay: {
      enabled: false,
    },
    lod: {
      lowDistanceMultiplier: 12,
      hideDistanceMultiplier: 24,
      progressive: {
        enabled: false,
        refineDelayFrames: 2,
      },
    },
    chunkLoad: {
      initialRadius: 1,
      initialDims: 2,
      activeRadius: 1,
      activeDims: 3,
    },
    occlusion: {
      enabled: false,
      queryDelayFrames: 2,
      maxQueriesPerFrame: 16,
    },
  },
};

export default defaultRenderConfig;
