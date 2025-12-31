import { getConfig } from "../config/index";
import { getGroundHeightWithEdits } from "./collision";

export const getPlayerGroundHeight = (x: number, z: number, prestigeLevel = 1): number => {
  // Player logic historically quantized positions to the nearest voxel grid
  const surface = getGroundHeightWithEdits(x, z, prestigeLevel);
  const cfg = getConfig();
  return surface + 1.0 + cfg.player.playerHeight;
};
