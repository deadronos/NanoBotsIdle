import { BlockId, BLOCKS } from "../voxel/World";

export const INVENTORY_BLOCKS: BlockId[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Sand,
  BlockId.Wood,
  BlockId.Leaves,
  BlockId.Planks,
  BlockId.Brick,
  BlockId.Glass,
  BlockId.Torch
];

export function isPlaceableBlock(id: BlockId): boolean {
  return id !== BlockId.Air && id !== BlockId.Water && id !== BlockId.Bedrock;
}

export function tileForBlockIcon(id: BlockId): number {
  const tile = BLOCKS[id]?.tile;
  if (!tile) return 0;
  return tile.all ?? tile.top ?? tile.side ?? tile.bottom ?? 0;
}
