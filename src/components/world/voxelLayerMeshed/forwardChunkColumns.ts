/** Visit two rows of terrain beyond the player's local chunk neighborhood. */
export const forEachForwardChunkColumn = (
  centerX: number,
  centerZ: number,
  directionX: number,
  directionZ: number,
  activeRadius: number,
  visit: (cx: number, cz: number) => void,
): void => {
  const widthX = directionX === 0 ? 1 : 0;
  const widthZ = 1 - widthX;
  for (let depth = activeRadius + 1; depth <= activeRadius + 2; depth++) {
    for (const offset of [0, -1, 1]) {
      visit(
        centerX + depth * directionX + offset * widthX,
        centerZ + depth * directionZ + offset * widthZ,
      );
    }
  }
};
