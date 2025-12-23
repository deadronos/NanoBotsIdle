export const RENDERING = {
  gl: { antialias: false, powerPreference: "high-performance" } as const,
  dpr: [1, 2] as [number, number],
  camera: { fov: 75, near: 0.05, far: 900, position: [8, 24, 8] as const },
};

export const SKY = {
  distance: 450000,
  turbidity: 7,
  rayleigh: 1.2,
  mieCoefficient: 0.004,
  mieDirectionalG: 0.82,
  sunOrbitRadius: 90,
  sunHeight: 120,
};

export const FOG = {
  color: 0x8cc9ff,
  density: 0.0038,
};

export const HIGHLIGHT = {
  boxScale: 1.01,
  baseColor: 0xfdf7da,
  miningColor: 0xffc57a,
  baseOpacity: 0.85,
  miningOpacityMin: 0.55,
  miningOpacityScale: 0.4,
};

export const DEFAULT_LIGHTS = {
  ambientIntensity: 0.45,
  sunIntensity: 0.75,
  sunPosition: { x: 80, y: 140, z: 50 },
};

export const INSTANCED_BATCHES = {
  mobs: {
    capacity: 64,
    size: { x: 0.6, y: 1, z: 0.6 },
    color: 0xf1c27d,
  },
  items: {
    capacity: 128,
    size: 0.35,
  },
};
