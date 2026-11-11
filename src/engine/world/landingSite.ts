import type { Config } from "../../config/index";
import { getSurfaceHeightCore } from "../../sim/terrain-core";

export const STARTER_OUTPOST_ID = "starter-outpost";
const OUTPOST_RADIUS = 2;
const PLAYER_OFFSET_X = 3;
const PLAYER_OFFSET_Z = 5;
const CAMERA_CLEARANCE = 13;

export const findLandingSite = (seed: number, cfg: Config) => {
  const { terrain, player } = cfg;
  const originX = Math.floor(player.spawnX ?? 0) - PLAYER_OFFSET_X;
  const originZ = Math.floor(player.spawnZ ?? 0) - PLAYER_OFFSET_Z;
  const radius = Math.min(12, Math.max(0, Math.floor(terrain.worldRadius) - CAMERA_CLEARANCE));
  const heightAt = (x: number, z: number) =>
    getSurfaceHeightCore(x, z, seed, terrain.surfaceBias, terrain.quantizeScale);

  let bestX = originX;
  let bestZ = originZ;
  let bestSurface = heightAt(bestX, bestZ);
  let bestScore = Infinity;
  let foundationX = bestX;
  let foundationZ = bestZ;

  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = originX + dx;
      const z = originZ + dz;
      let low = Infinity;
      let high = heightAt(x, z);
      let supportX = x;
      let supportZ = z;
      for (let oz = -OUTPOST_RADIUS; oz <= OUTPOST_RADIUS; oz++) {
        for (let ox = -OUTPOST_RADIUS; ox <= OUTPOST_RADIUS; ox++) {
          if (ox * ox + oz * oz > OUTPOST_RADIUS * OUTPOST_RADIUS) continue;
          const height = heightAt(x + ox, z + oz);
          low = Math.min(low, height);
          if (height > high) {
            high = height;
            supportX = x + ox;
            supportZ = z + oz;
          }
        }
      }

      const playerGround = heightAt(x + PLAYER_OFFSET_X, z + PLAYER_OFFSET_Z);
      let obstruction = 0;
      for (let offset = PLAYER_OFFSET_Z + 1; offset <= CAMERA_CLEARANCE; offset++) {
        obstruction = Math.max(
          obstruction,
          heightAt(x + PLAYER_OFFSET_X, z + offset) - playerGround,
        );
      }
      const waterDepth = Math.max(0, terrain.waterLevel - Math.min(low, playerGround));
      const score =
        1_000 * waterDepth +
        32 * (high - heightAt(x, z)) +
        16 * (high - low) +
        8 * obstruction +
        4 * Math.abs(high - playerGround) +
        Math.hypot(dx, dz);

      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestZ = z;
        bestSurface = high;
        foundationX = supportX;
        foundationZ = supportZ;
      }
    }
  }

  const playerX = bestX + PLAYER_OFFSET_X;
  const playerZ = bestZ + PLAYER_OFFSET_Z;
  return {
    foundation: { x: foundationX, z: foundationZ },
    outpost: { x: bestX + 0.25, y: bestSurface + 1, z: bestZ + 0.25 },
    spawn: {
      x: playerX + 0.25,
      y: heightAt(playerX, playerZ) + 1 + player.playerHeight,
      z: playerZ + 0.25,
    },
  };
};
