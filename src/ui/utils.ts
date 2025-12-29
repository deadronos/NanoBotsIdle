import { ATLAS_PX, TILE_PX, TILES_PER_ROW } from "../config/atlas";

export function iconStyle(tile: number, atlasUrl?: string) {
  if (!atlasUrl) return undefined;
  const x = (tile % TILES_PER_ROW) * TILE_PX;
  const y = Math.floor(tile / TILES_PER_ROW) * TILE_PX;
  return {
    backgroundImage: `url(${atlasUrl})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundSize: `${ATLAS_PX}px ${ATLAS_PX}px`,
  } as const;
}

export function timeLabel(t: number) {
  if (t < 0.22) return "Dawn";
  if (t < 0.5) return "Noon";
  if (t < 0.72) return "Dusk";
  return "Night";
}
