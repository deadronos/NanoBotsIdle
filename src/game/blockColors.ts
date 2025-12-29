import * as THREE from "three";

import { BlockId } from "../voxel/World";

export const DEFAULT_BLOCK_COLOR = new THREE.Color(0xcfc4a9);

export const BLOCK_COLORS: Partial<Record<BlockId, THREE.Color>> = {
  [BlockId.Grass]: new THREE.Color(0x7fbf6a),
  [BlockId.Dirt]: new THREE.Color(0x8b6238),
  [BlockId.Stone]: new THREE.Color(0x9ca1a8),
  [BlockId.Sand]: new THREE.Color(0xd6c289),
  [BlockId.Wood]: new THREE.Color(0xb88758),
  [BlockId.Leaves]: new THREE.Color(0x6bbf73),
  [BlockId.CoalOre]: new THREE.Color(0x8a8f96),
  [BlockId.IronOre]: new THREE.Color(0xc49a6c),
  [BlockId.GoldOre]: new THREE.Color(0xd2b14c),
  [BlockId.DiamondOre]: new THREE.Color(0x6bd6d1),
};
