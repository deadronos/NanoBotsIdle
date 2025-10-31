import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../state/store";

const TILE_SIZE = 12;
const GRID_WIDTH = 64;
const GRID_HEIGHT = 64;

export function PathDebugOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugMode, setDebugMode] = useState<"off" | "congestion" | "paths">("off");
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const world = useGameStore((s) => s.world);

  // Toggle debug mode with 'D' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        setDebugMode((prev) => {
          if (prev === "off") return "congestion";
          if (prev === "congestion") return "paths";
          return "off";
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (debugMode === "off") return;

    const canvas = canvasRef.current;
    if (!canvas || !snapshot || !world) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (debugMode === "congestion") {
      // Draw congestion heatmap
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const idx = y * GRID_WIDTH + x;
          const cost = world.grid.walkCost[idx] || 1;

          // Map cost to color (1.0 = clear, >1.0 = red, <1.0 = blue/green for lanes)
          let alpha = 0;
          let color = "";

          if (cost > 1.0) {
            // Congestion - red
            alpha = Math.min((cost - 1.0) / 3.0, 0.6);
            color = `rgba(239, 68, 68, ${alpha})`;
          } else if (cost < 1.0) {
            // Lane - cyan/blue
            alpha = Math.min((1.0 - cost) / 0.2, 0.5);
            color = `rgba(6, 182, 212, ${alpha})`;
          }

          if (alpha > 0.05) {
            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Draw legend
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 180, 80);
      
      ctx.font = "12px monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText("Congestion Heatmap", 20, 30);
      
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
      ctx.fillRect(20, 40, 20, 10);
      ctx.fillStyle = "#fff";
      ctx.fillText("High Traffic", 45, 49);
      
      ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
      ctx.fillRect(20, 55, 20, 10);
      ctx.fillStyle = "#fff";
      ctx.fillText("Lanes (Fast)", 45, 64);
      ctx.fillText("Press D to cycle", 20, 80);

    } else if (debugMode === "paths") {
      // Draw active drone paths
      Object.entries(world.path).forEach(([idStr, path]) => {
        const id = Number(idStr);
        const pos = world.position[id];
        if (!pos || !path || path.nodes.length === 0) return;

        // Draw path line
        ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = path.idx; i < path.nodes.length; i++) {
          const node = path.nodes[i];
          const x = node.x * TILE_SIZE;
          const y = node.y * TILE_SIZE;

          if (i === path.idx) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();

        // Draw waypoints
        for (let i = path.idx; i < path.nodes.length; i++) {
          const node = path.nodes[i];
          const x = node.x * TILE_SIZE;
          const y = node.y * TILE_SIZE;

          ctx.fillStyle = i === path.idx ? "rgba(251, 191, 36, 0.8)" : "rgba(251, 191, 36, 0.4)";
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw legend
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 180, 65);
      
      ctx.font = "12px monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText("Active Paths", 20, 30);
      
      ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 45);
      ctx.lineTo(60, 45);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText("Drone Routes", 65, 49);
      ctx.fillText("Press D to cycle", 20, 65);
    }
  }, [debugMode, snapshot, world]);

  if (debugMode === "off") return null;

  return (
    <canvas
      ref={canvasRef}
      width={GRID_WIDTH * TILE_SIZE}
      height={GRID_HEIGHT * TILE_SIZE}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
