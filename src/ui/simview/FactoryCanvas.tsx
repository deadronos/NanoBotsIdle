import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/store";

const TILE_SIZE = 12;
const GRID_WIDTH = 64;
const GRID_HEIGHT = 64;

export function FactoryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
  const placeBuilding = useGameStore((s) => s.placeBuilding);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedBuildingType) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor(clickX / TILE_SIZE);
    const gridY = Math.floor(clickY / TILE_SIZE);

    // Place building
    const success = placeBuilding(gridX, gridY);
    if (!success) {
      console.log("Failed to place building");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
      ctx.stroke();
    }

    // Draw buildings
    snapshot.buildings.forEach((building) => {
      const x = building.x * TILE_SIZE;
      const y = building.y * TILE_SIZE;

      // Color based on type
      let color = "#888";
      if (building.type === "Core") color = "#10b981"; // emerald
      else if (building.type === "Extractor") color = "#3b82f6"; // blue
      else if (building.type === "Assembler") color = "#8b5cf6"; // purple
      else if (building.type === "Fabricator") color = "#f59e0b"; // amber

      ctx.fillStyle = building.online ? color : "#333";
      ctx.fillRect(x - 4, y - 4, 8, 8);

      // Draw tier indicator
      if (building.tier && building.tier > 1) {
        ctx.fillStyle = "#fff";
        ctx.font = "8px monospace";
        ctx.fillText(`T${building.tier}`, x + 6, y + 3);
      }

      // Draw type label
      ctx.fillStyle = "#aaa";
      ctx.font = "7px monospace";
      const label = building.type.substring(0, 3).toUpperCase();
      ctx.fillText(label, x - 8, y - 6);
    });

    // Draw drones
    snapshot.drones.forEach((drone) => {
      const x = drone.x * TILE_SIZE;
      const y = drone.y * TILE_SIZE;

      // Color based on role
      let color = "#fff";
      if (drone.role === "hauler") color = "#60a5fa"; // light blue
      else if (drone.role === "builder") color = "#fbbf24"; // yellow
      else if (drone.role === "maintainer") color = "#34d399"; // green

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw heat overlay if high
    if (snapshot.heatRatio > 0.6) {
      const alpha = Math.min((snapshot.heatRatio - 0.6) * 1.5, 0.3);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [snapshot]);

  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * TILE_SIZE}
          height={GRID_HEIGHT * TILE_SIZE}
          className={`border border-neutral-800 rounded-lg ${
            selectedBuildingType ? "cursor-crosshair" : "cursor-default"
          }`}
          onClick={handleCanvasClick}
        />
        {selectedBuildingType && (
          <div className="absolute top-4 left-4 bg-emerald-900/80 backdrop-blur px-3 py-2 rounded text-sm text-emerald-200">
            Placing: {selectedBuildingType}
          </div>
        )}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur px-3 py-2 rounded text-xs text-neutral-400">
          <div>🟦 Extractor  🟪 Assembler  🟨 Fabricator</div>
          <div>🔵 Hauler  🟡 Builder  🟢 Maintainer</div>
        </div>
      </div>
    </div>
  );
}
