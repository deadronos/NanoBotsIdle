export const MATERIAL_AIR = 0 as const;
export const MATERIAL_SOLID = 1 as const;
export const MATERIAL_BEDROCK = 2 as const;

export type VoxelMaterial = typeof MATERIAL_AIR | typeof MATERIAL_SOLID | typeof MATERIAL_BEDROCK;

export const voxelKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export const coordsFromVoxelKey = (key: string) => {
  const [x, y, z] = key.split(",").map((value) => Number(value));
  return { x, y, z };
};
