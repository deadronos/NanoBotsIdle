import * as THREE from "three";

import { ATLAS_PX, TILE_PX, TILES_PER_ROW } from "../config/atlas";
import type { BlockDef } from "./World";

export type Atlas = {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
};

type RendererLike = { capabilities: { getMaxAnisotropy: () => number } };

/**
 * Build a tiny pixel atlas on the fly so you can run without assets.
 * Tile IDs are hardcoded in World.ts.
 */
export function createAtlasTexture(renderer: RendererLike, blocks: readonly BlockDef[]): Atlas {
  void blocks;

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_PX;
  canvas.height = ATLAS_PX;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Tile 0 = fully transparent.
  ctx.clearRect(0, 0, ATLAS_PX, ATLAS_PX);

  function paintTile(tile: number, base: string, accent?: string) {
    const x0 = (tile % TILES_PER_ROW) * TILE_PX;
    const y0 = Math.floor(tile / TILES_PER_ROW) * TILE_PX;

    ctx.fillStyle = base;
    ctx.fillRect(x0, y0, TILE_PX, TILE_PX);

    // Add a small pixel noise pattern to feel more "blocky".
    if (accent) {
      ctx.fillStyle = accent;
      for (let i = 0; i < 22; i++) {
        const px = x0 + ((i * 7 + tile * 13) % TILE_PX);
        const py = y0 + ((i * 11 + tile * 17) % TILE_PX);
        ctx.fillRect(px, py, 1, 1);
      }
    }

    // Subtle border
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE_PX - 1, TILE_PX - 1);
  }

  // Define a few tiles used by World.ts.
  paintTile(1, "#3ca53c", "#2f7f2f"); // grass top
  paintTile(2, "#3b8f2f", "#2b6a23"); // grass side
  paintTile(3, "#7a4f2b", "#5f3c20"); // dirt
  paintTile(4, "#8f8f93", "#6f6f74"); // stone
  paintTile(5, "rgba(50,120,220,0.65)", "rgba(255,255,255,0.25)"); // water
  paintTile(6, "#d8c07b", "#b49c58"); // sand
  paintTile(7, "#8a5a2e", "#6f4522"); // wood side
  paintTile(8, "#a06c3a", "#6f4522"); // wood top/bottom
  paintTile(9, "rgba(65,160,75,0.75)", "rgba(255,255,255,0.18)"); // leaves
  paintTile(10, "#c99753", "#b07b42"); // planks
  paintTile(11, "#b84e4b", "#923634"); // brick
  paintTile(12, "rgba(160,210,230,0.65)", "rgba(255,255,255,0.22)"); // glass
  paintTile(13, "#f2c86d", "#a36d32"); // torch
  paintTile(14, "#4b4b4f", "#2f2f33"); // bedrock
  paintTile(15, "#6f6f74", "#2b2b2b"); // coal ore
  paintTile(16, "#8f8f93", "#b9856c"); // iron ore
  paintTile(17, "#8f8f93", "#d4ad3e"); // gold ore
  paintTile(18, "#8f8f93", "#5bd0d0"); // diamond ore

  // optional: paint the rest as debug checker.
  for (let t = 10; t < TILES_PER_ROW * TILES_PER_ROW; t++) {
    const x0 = (t % TILES_PER_ROW) * TILE_PX;
    const y0 = Math.floor(t / TILES_PER_ROW) * TILE_PX;
    ctx.fillStyle = t % 2 === 0 ? "rgba(255,0,255,0.06)" : "rgba(0,255,255,0.06)";
    ctx.fillRect(x0, y0, TILE_PX, TILE_PX);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipMapNearestFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return { canvas, texture };
}
