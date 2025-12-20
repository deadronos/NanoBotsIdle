const tilesPerRow = 16;
const tilePx = 16;
const atlasPx = tilesPerRow * tilePx;

export function iconStyle(tile: number, atlasUrl?: string) {
  if (!atlasUrl) return undefined;
  const x = (tile % tilesPerRow) * tilePx;
  const y = Math.floor(tile / tilesPerRow) * tilePx;
  return {
    backgroundImage: `url(${atlasUrl})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundSize: `${atlasPx}px ${atlasPx}px`
  } as const;
}

export function timeLabel(t: number) {
  if (t < 0.22) return "Dawn";
  if (t < 0.5) return "Noon";
  if (t < 0.72) return "Dusk";
  return "Night";
}
