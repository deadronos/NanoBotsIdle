import { BlockId } from "../voxel/World";

export type Recipe = {
  id: string;
  name: string;
  output: { id: BlockId; count: number };
  input: { id: BlockId; count: number }[];
};

export const RECIPES: Recipe[] = [
  {
    id: "planks",
    name: "Planks",
    output: { id: BlockId.Planks, count: 4 },
    input: [{ id: BlockId.Wood, count: 1 }]
  },
  {
    id: "brick",
    name: "Brick",
    output: { id: BlockId.Brick, count: 4 },
    input: [{ id: BlockId.Stone, count: 4 }]
  },
  {
    id: "glass",
    name: "Glass",
    output: { id: BlockId.Glass, count: 4 },
    input: [{ id: BlockId.Sand, count: 4 }]
  },
  {
    id: "torch",
    name: "Torch",
    output: { id: BlockId.Torch, count: 4 },
    input: [
      { id: BlockId.Planks, count: 2 },
      { id: BlockId.Leaves, count: 1 }
    ]
  }
];
