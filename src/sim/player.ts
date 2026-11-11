import { getConfig } from "../config/index";
import { getGroundHeightWithEdits } from "./collision";

export const getPlayerGroundHeight = (
  x: number,
  z: number,
  prestigeLevel = 1,
  seed?: number,
): number => {
  const cfg = getConfig();
  const meshed = cfg.render.voxels.mode === "meshed";
  const voxel = meshed ? Math.floor : Math.round;
  const surface = getGroundHeightWithEdits(voxel(x), voxel(z), prestigeLevel, seed);
  return surface + (meshed ? 1 : 0.5) + cfg.player.playerHeight;
};
