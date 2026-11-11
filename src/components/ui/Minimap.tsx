import React, { useEffect, useRef } from "react";

import { playerPosition } from "../../engine/playerState";
import { getSimBridge } from "../../simBridge/simBridge";

const SIZE = 150;
const CENTER = SIZE / 2;
const RANGE = 64;
const SCALE = CENTER / RANGE;
const UPDATE_INTERVAL_MS = 100;
const RINGS = [22, 44, 66];

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let lastDraw = -Infinity;
    const draw = (positions?: Float32Array) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = "#34454f";
      for (const radius of RINGS) {
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (positions) {
        ctx.fillStyle = "#88d1bb";
        const { x, z } = playerPosition;
        for (let i = 0; i < positions.length; i += 3) {
          const dx = positions[i] - x;
          const dz = positions[i + 2] - z;
          if (Math.abs(dx) < RANGE && Math.abs(dz) < RANGE) {
            ctx.fillRect(CENTER + dx * SCALE - 1.5, CENTER + dz * SCALE - 1.5, 3, 3);
          }
        }
      }

      ctx.fillStyle = "#f4bf66";
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    return getSimBridge().onFrame((frame) => {
      const positions = frame.delta.entities;
      if (!positions) return;
      const now = performance.now();
      if (now - lastDraw < UPDATE_INTERVAL_MS) return;
      lastDraw = now;
      draw(positions);
    });
  }, []);

  return (
    <figure className="game-panel pointer-events-none absolute top-full right-0 mt-2 p-1">
      <figcaption className="game-stat-label px-2 pt-1">Drone map</figcaption>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        aria-label="Drone positions relative to the player"
      />
    </figure>
  );
};
