import React, { useEffect, useRef } from "react";

import { playerPosition } from "../../engine/playerState";
import { DRONE_STATE_ID } from "../../shared/droneState";
import { MINING_ZONE_RADIUS } from "../../shared/miningOperations";
import { getSimBridge } from "../../simBridge/simBridge";
import type { FrameMessage } from "../../simBridge/types";
import { useUiStore } from "../../ui/store";

const SIZE = 150;
const CENTER = SIZE / 2;
const RANGE = 64;
const SCALE = CENTER / RANGE;
const UPDATE_INTERVAL_MS = 100;
const RINGS = [22, 44, 66];

export const Minimap: React.FC<{ belowMenus: boolean }> = ({ belowMenus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let lastDraw = -Infinity;
    const draw = (frame?: FrameMessage) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = "#34454f";
      for (const radius of RINGS) {
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      const { x, z } = playerPosition;
      const mapX = (value: number) => CENTER + (value - x) * SCALE;
      const mapZ = (value: number) => CENTER + (value - z) * SCALE;
      const zone = frame?.ui.miningZone;
      if (zone) {
        ctx.strokeStyle = "#6ce4c4";
        ctx.beginPath();
        ctx.arc(mapX(zone.x), mapZ(zone.z), MINING_ZONE_RADIUS * SCALE, 0, Math.PI * 2);
        ctx.stroke();
      }

      const positions = frame?.delta.entities;
      const routes = frame?.delta.returnRoutes;
      if (positions) {
        ctx.strokeStyle = "#f4bf6690";
        ctx.beginPath();
        for (let i = 0; routes && i < positions.length / 3; i++) {
          if (!Number.isFinite(routes[i * 2])) continue;
          ctx.moveTo(mapX(positions[i * 3]), mapZ(positions[i * 3 + 2]));
          ctx.lineTo(mapX(routes[i * 2]), mapZ(routes[i * 2 + 1]));
        }
        ctx.stroke();
        const { buildingMode, placement, outpostPreview } = useUiStore.getState();
        if (buildingMode === "OUTPOST" && placement && outpostPreview) {
          const { redirected } = outpostPreview;
          ctx.strokeStyle = "#92e8ff";
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          for (const index of redirected) {
            ctx.moveTo(mapX(positions[index * 3]), mapZ(positions[index * 3 + 2]));
            ctx.lineTo(mapX(placement.x), mapZ(placement.z));
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeRect(mapX(placement.x) - 3, mapZ(placement.z) - 3, 6, 6);
        }
        for (let i = 0; i < positions.length / 3; i++) {
          const state = frame?.delta.entityStates?.[i];
          ctx.fillStyle =
            state === DRONE_STATE_ID.MINING ? "#fa947d"
            : (frame?.delta.entityCargo?.[i] ?? 0) > 0 ? "#f4bf66"
            : "#88d1bb";
          ctx.fillRect(mapX(positions[i * 3]) - 1.5, mapZ(positions[i * 3 + 2]) - 1.5, 3, 3);
        }
      }

      ctx.fillStyle = "#e5e7eb";
      for (const outpost of frame?.delta.outposts ?? []) {
        ctx.strokeStyle = outpost.queuedCount ? "#fa947d" : "#e5e7eb";
        ctx.strokeRect(mapX(outpost.x) - 2.5, mapZ(outpost.z) - 2.5, 5, 5);
      }

      ctx.fillStyle = "#f4bf66";
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    return getSimBridge().onFrame((frame) => {
      const now = performance.now();
      if (now - lastDraw < UPDATE_INTERVAL_MS) return;
      lastDraw = now;
      draw(frame);
    });
  }, []);

  return (
    <figure className="game-panel pointer-events-none absolute top-full right-0 mt-2 p-1">
      <figcaption className="game-stat-label px-2 pt-1">Drone map</figcaption>
      <canvas
        ref={canvasRef}
        className={belowMenus ? "w-[92px] sm:w-auto" : undefined}
        width={SIZE}
        height={SIZE}
        aria-label="Drone positions, mining zone, and outpost return routes"
      />
    </figure>
  );
};
