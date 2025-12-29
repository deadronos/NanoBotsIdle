import { PLAYER_HEIGHT } from "../constants";
import { getSeed,getSurfaceHeight } from "./terrain";

export const getPlayerGroundHeight = (x: number, z: number, prestigeLevel = 1): number => {
  // Player logic historically quantized positions to the nearest voxel grid
  const seed = getSeed(prestigeLevel);
  const surface = getSurfaceHeight(Math.round(x), Math.round(z), seed);
  return surface + 0.5 + PLAYER_HEIGHT;
};
