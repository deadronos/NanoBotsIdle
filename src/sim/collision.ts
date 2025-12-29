import { getConfig } from "../config/index";
import { getSeed, getSurfaceHeight } from "./terrain";

type VoxelEdit = { x: number; y: number; z: number; mat: number };

export const MATERIAL_AIR = 0;
export const MATERIAL_SOLID = 1;
export const MATERIAL_BEDROCK = 2;

const edits = new Map<string, number>();

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

const baseMaterialAt = (x: number, y: number, z: number, seed: number) => {
  const cfg = getConfig();
  const bedrockY = cfg.terrain.bedrockY ?? -50;
  if (y <= bedrockY) return MATERIAL_BEDROCK;
  const surfaceY = getSurfaceHeight(x, z, seed);
  if (y <= surfaceY) return MATERIAL_SOLID;
  return MATERIAL_AIR;
};

const materialAt = (x: number, y: number, z: number, seed: number) => {
  const override = edits.get(key(x, y, z));
  if (override !== undefined) return override;
  return baseMaterialAt(x, y, z, seed);
};

export const applyVoxelEdits = (incoming: VoxelEdit[]) => {
  for (const edit of incoming) {
    edits.set(key(edit.x, edit.y, edit.z), edit.mat);
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
  const surfaceY = getSurfaceHeight(Math.round(x), Math.round(z), seed);
  for (let y = surfaceY; y >= bedrockY; y -= 1) {
    const mat = materialAt(Math.round(x), y, Math.round(z), seed);
    if (mat === MATERIAL_SOLID || mat === MATERIAL_BEDROCK) return y;
  }
  return bedrockY;
};
