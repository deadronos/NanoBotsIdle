import type { Config } from "../config/index";
import { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID, type VoxelMaterial } from "../shared/voxel";
import { getSurfaceHeightCore } from "./terrain-core";

export const getBaseMaterialAt = (
  x: number,
  y: number,
  z: number,
  seed: number,
  bedrockY: number,
  cfg: Config,
): VoxelMaterial => {
  if (y <= bedrockY) return MATERIAL_BEDROCK;

  const surfaceY = getSurfaceHeightCore(
    x,
    z,
    seed,
    cfg.terrain.surfaceBias,
    cfg.terrain.quantizeScale,
  );

  if (y <= surfaceY) return MATERIAL_SOLID;
  return MATERIAL_AIR;
};

