export type SkyConfig = {
  distance: number;
  sunPosition: [number, number, number];
  inclination: number;
  azimuth: number;
  turbidity: number;
  rayleigh: number;
};

export type StarsConfig = {
  radius: number;
  depth: number;
  count: number;
  factor: number;
  saturation: number;
  fade: boolean;
  speed: number;
};

export type CloudConfig = {
  rotationSpeed: number;
  groupY: number;
  cloud1: {
    segments: number;
    bounds: [number, number, number];
    volume: number;
    color: string;
  };
  cloud2: {
    seed: number;
    scale: number;
    volume: number;
    color: string;
    fade: number;
  };
};

export type SunConfig = {
  position: [number, number, number];
  intensity: number;
  shadowMapSize: [number, number];
  cameraBounds: { left: number; right: number; top: number; bottom: number };
};

export const voxelRenderModes = ["frontier", "dense", "meshed"] as const;

export type VoxelRenderMode = (typeof voxelRenderModes)[number];

export type RenderConfig = {
  sky: SkyConfig;
  stars: StarsConfig;
  clouds: CloudConfig;
  ambientLightIntensity: number;
  sun: SunConfig;
  voxels: {
    mode: VoxelRenderMode;
    debugCompare: {
      enabled: boolean;
      radiusChunks: number;
      logIntervalMs: number;
    };
  };
};

export const defaultRenderConfig: RenderConfig = {
  sky: {
    distance: 450000,
    sunPosition: [100, 20, 100],
    inclination: 0,
    azimuth: 0.25,
    turbidity: 10,
    rayleigh: 2,
  },
  stars: {
    radius: 100,
    depth: 50,
    count: 5000,
    factor: 4,
    saturation: 0,
    fade: true,
    speed: 1,
  },
  clouds: {
    rotationSpeed: 0.01,
    groupY: 20,
    cloud1: { segments: 40, bounds: [20, 2, 20], volume: 10, color: "#ecf0f1" },
    cloud2: { seed: 1, scale: 2, volume: 5, color: "#bdc3c7", fade: 100 },
  },
  ambientLightIntensity: 0.4,
  sun: {
    position: [50, 50, 20],
    intensity: 1.5,
    shadowMapSize: [2048, 2048],
    cameraBounds: { left: -50, right: 50, top: 50, bottom: -50 },
  },
  voxels: {
    mode: "meshed",
    debugCompare: {
      enabled: false,
      radiusChunks: 1,
      logIntervalMs: 1000,
    },
  },
};

export default defaultRenderConfig;
