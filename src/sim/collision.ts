import { getConfig } from "../config/index";
import type { VoxelEdit } from "../shared/protocol";
import { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID, voxelKey } from "../shared/voxel";
import { getSeed } from "./seed";
import { getSurfaceHeightCore } from "./terrain-core";

export { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID };

const edits = new Map<string, number>();

const baseMaterialAt = (x: number, y: number, z: number, seed: number) => {
  const cfg = getConfig();
  const bedrockY = cfg.terrain.bedrockY ?? -50;
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

const materialAt = (x: number, y: number, z: number, seed: number) => {
  const override = edits.get(voxelKey(x, y, z));
  if (override !== undefined) return override;
  return baseMaterialAt(x, y, z, seed);
};

export const applyVoxelEdits = (incoming: VoxelEdit[]) => {
  for (const edit of incoming) {
    edits.set(voxelKey(edit.x, edit.y, edit.z), edit.mat);
  }
};

export const resetVoxelEdits = () => {
  edits.clear();
};

export const getVoxelMaterialAt = (x: number, y: number, z: number, prestigeLevel = 1) => {
  const seed = getSeed(prestigeLevel);
  return materialAt(x, y, z, seed);
};

export const getGroundHeightWithEdits = (x: number, z: number, prestigeLevel = 1) => {
  const seed = getSeed(prestigeLevel);
  const cfg = getConfig();
  const bedrockY = cfg.terrain.bedrockY ?? -50;
  const surfaceY = getSurfaceHeightCore(
    Math.round(x),
    Math.round(z),
    seed,
    cfg.terrain.surfaceBias,
    cfg.terrain.quantizeScale,
  );
  for (let y = surfaceY; y >= bedrockY; y -= 1) {
    const mat = materialAt(Math.round(x), y, Math.round(z), seed);
    if (mat === MATERIAL_SOLID || mat === MATERIAL_BEDROCK) return y;
  }
  return bedrockY;
};
