import React, { useEffect, useRef } from "react";

import { getSimBridge } from "../../simBridge/simBridge";

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const bridge = getSimBridge();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const unsubscribe = bridge.onFrame((frame) => {
      const positions = frame.delta.entities;
      if (!positions) return;

      const size = 150;
      canvas.width = size;
      canvas.height = size;

      // Clear
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, size, size);

      // Draw border
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, size, size);

      // Player pos (center) is (0,0) relative to local view, but drone positions are world space.
      // We need player world position.
      // It's not in the frame delta directly usually, but `frame.ui` has some stats.
      // However, `Player.tsx` keeps player pos locally.
      // We can use a simpler approach: Drones are around the player usually.
      // OR we can get player pos from `useUiStore` if we stored it, but we don't.
      // `simBridge` does not send player pos back every frame in `ui` unless we added it.
      // But `Player.tsx` sends it TO the worker.

      // Let's assume (0,0) center for now or try to get player pos from a store if available.
      // The `Player` component updates `playerPosition` vector in `src/engine/playerState`.
      // We can import that if it's shared memory, but it's likely client-side only state.
      // Yes, `src/engine/playerState.ts` exports `playerPosition`.

      // Draw Player (Center)
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw Drones
      // positions is Float32Array [x, y, z, x, y, z, ...]

      // We need to know where the player IS to offset the drones.
      // The `playerPosition` from `playerState` is mutable Vector3.

      import("../../engine/playerState").then(({ playerPosition }) => {
         const pX = playerPosition.x;
         const pZ = playerPosition.z;

         const range = 64; // blocks radius to show
         const scale = size / (range * 2);

         ctx.fillStyle = "#00ffff";
         for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];

            const dx = x - pX;
            const dz = z - pZ;

            if (Math.abs(dx) < range && Math.abs(dz) < range) {
               const mx = (size / 2) + dx * scale;
               const my = (size / 2) + dz * scale;
               ctx.fillRect(mx - 1, my - 1, 2, 2);
            }
         }
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="absolute top-4 right-4 pointer-events-none opacity-80">
      <canvas ref={canvasRef} className="rounded-lg border border-slate-700 bg-slate-900/80" />
    </div>
  );
};
