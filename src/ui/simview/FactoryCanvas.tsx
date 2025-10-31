import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../state/store";
import { BuildingInfoPanel } from "../panels/BuildingInfoPanel";
import { PathDebugOverlay } from "./PathDebugOverlay";
import { AnimationManager } from "./animations";

const TILE_SIZE = 12;
const GRID_WIDTH = 64;
const GRID_HEIGHT = 64;

// Track animation manager instance
let animationManager: AnimationManager | null = null;

export function FactoryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
  const selectedEntity = useGameStore((s) => s.selectedEntity);
  const setSelectedEntity = useGameStore((s) => s.setSelectedEntity);
  const placeBuilding = useGameStore((s) => s.placeBuilding);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize animation manager
  if (!animationManager) {
    animationManager = new AnimationManager();
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor(clickX / TILE_SIZE);
    const gridY = Math.floor(clickY / TILE_SIZE);

    if (selectedBuildingType) {
      // Place building
      const success = placeBuilding(gridX, gridY);
      if (success) {
        // Add construction particles
        animationManager?.addConstructionParticles(gridX * TILE_SIZE, gridY * TILE_SIZE);
        // Start construction animation
        // Note: Linear search is acceptable here as building count is typically small (<100)
        // and placement is an infrequent user action
        const newBuilding = snapshot?.buildings.find((b) => b.x === gridX && b.y === gridY);
        if (newBuilding) {
          animationManager?.startBuildingAnimation(newBuilding.id, 'construction', 1000);
        }
      } else {
        console.log("Failed to place building");
      }
    } else {
      // Try to select a building at this position
      const building = snapshot?.buildings.find((b) => b.x === gridX && b.y === gridY);
      if (building) {
        setSelectedEntity(building.id);
      } else {
        setSelectedEntity(null);
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedBuildingType) {
      setGhostPosition(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor(mouseX / TILE_SIZE);
    const gridY = Math.floor(mouseY / TILE_SIZE);

    setGhostPosition({ x: gridX, y: gridY });
  };

  const handleCanvasMouseLeave = () => {
    setGhostPosition(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Animation loop
    const animate = (currentTime: number) => {
      // Update animation manager
      animationManager?.update(currentTime);

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

      // Draw drone trails first (behind drones)
      const trails = animationManager?.getDroneTrails() || [];
      trails.forEach(trail => {
        if (trail.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(trail.points[0].x * TILE_SIZE, trail.points[0].y * TILE_SIZE);
        
        for (let i = 1; i < trail.points.length; i++) {
          ctx.lineTo(trail.points[i].x * TILE_SIZE, trail.points[i].y * TILE_SIZE);
        }
        
        // Gradient stroke from transparent to visible
        const gradient = ctx.createLinearGradient(
          trail.points[0].x * TILE_SIZE,
          trail.points[0].y * TILE_SIZE,
          trail.points[trail.points.length - 1].x * TILE_SIZE,
          trail.points[trail.points.length - 1].y * TILE_SIZE
        );
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0)');
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0.4)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // Draw buildings
      snapshot.buildings.forEach((building) => {
        const x = building.x * TILE_SIZE;
        const y = building.y * TILE_SIZE;
        const isSelected = building.id === selectedEntity;
        const buildingAnim = animationManager?.getBuildingAnimation(building.id);

        // Color based on type
        let color = "#888";
        if (building.type === "Core")
          color = "#10b981"; // emerald
        else if (building.type === "Extractor")
          color = "#3b82f6"; // blue
        else if (building.type === "Assembler")
          color = "#8b5cf6"; // purple
        else if (building.type === "Fabricator")
          color = "#f59e0b"; // amber
        else if (building.type === "Cooler")
          color = "#06b6d4"; // cyan
        else if (building.type === "Storage")
          color = "#6b7280"; // gray
        else if (building.type === "PowerVein")
          color = "#eab308"; // yellow
        else if (building.type === "CoreCompiler") color = "#ec4899"; // pink

        // Draw heat glow effect for hot buildings
        if (building.online && snapshot.heatRatio > 0.5) {
          const heatIntensity = (snapshot.heatRatio - 0.5) * 2;
          const glowSize = 12 + heatIntensity * 8;
          const glowAlpha = heatIntensity * 0.4;
          
          ctx.shadowBlur = glowSize;
          ctx.shadowColor = `rgba(239, 68, 68, ${glowAlpha})`;
          ctx.fillStyle = color;
          ctx.fillRect(x - 4, y - 4, 8, 8);
          ctx.shadowBlur = 0;
          
          // Add heat particles occasionally
          if (heatIntensity > 0.5 && Math.random() < 0.05) {
            animationManager?.addHeatParticles(x, y, heatIntensity);
          }
        } else {
          // Power vein pulsing animation
          if (building.type === "PowerVein" && building.online) {
            const pulsePhase = (currentTime / 1000) % 2;
            const pulseIntensity = Math.sin(pulsePhase * Math.PI) * 0.3 + 0.7;
            
            ctx.shadowBlur = 8 * pulseIntensity;
            ctx.shadowColor = color;
            ctx.globalAlpha = pulseIntensity;
            ctx.fillStyle = color;
            ctx.fillRect(x - 4, y - 4, 8, 8);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = building.online ? color : "#333";
            ctx.fillRect(x - 4, y - 4, 8, 8);
          }
        }

        // Construction animation
        if (buildingAnim && buildingAnim.type === 'construction') {
          const progress = buildingAnim.progress;
          const scale = 0.5 + progress * 0.5;
          const alpha = progress;
          
          ctx.globalAlpha = alpha;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.fillStyle = color;
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        // Production pulse effect for active producers
        if (building.online && (building.type === "Extractor" || building.type === "Assembler" || building.type === "Fabricator")) {
          // Emit production particles occasionally
          if (Math.random() < 0.02) {
            animationManager?.addProductionParticles(x, y, color);
          }
        }

        // Draw selection highlight
        if (isSelected) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 8, y - 8, 16, 16);
        }

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

      // Draw drones and update trails
      snapshot.drones.forEach((drone) => {
        const x = drone.x * TILE_SIZE;
        const y = drone.y * TILE_SIZE;

        // Update trail
        animationManager?.updateDroneTrail(drone.id, drone.x, drone.y);

        // Color based on role
        let color = "#fff";
        if (drone.role === "hauler")
          color = "#60a5fa"; // light blue
        else if (drone.role === "builder")
          color = "#fbbf24"; // yellow
        else if (drone.role === "maintainer") color = "#34d399"; // green

        // Draw cargo indicator if carrying something
        if (drone.cargoAmount > 0) {
          ctx.fillStyle = "#fbbf24"; // yellow for cargo
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

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

        // Add state indicator
        if (drone.state === "toPickup") {
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (drone.state === "toDropoff") {
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw particles with proper alpha handling
      const particles = animationManager?.getParticles() || [];
      particles.forEach(particle => {
        // Convert color to rgba format with alpha
        let particleColor = particle.color;
        const alpha = particle.life / particle.maxLife;
        
        // Handle different color formats
        if (particleColor.startsWith('#')) {
          // Convert hex to rgb
          const r = parseInt(particleColor.slice(1, 3), 16);
          const g = parseInt(particleColor.slice(3, 5), 16);
          const b = parseInt(particleColor.slice(5, 7), 16);
          particleColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (particleColor.startsWith('rgb(')) {
          // Convert rgb to rgba
          particleColor = particleColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        } else if (particleColor.startsWith('rgba(')) {
          // Already rgba, replace alpha
          particleColor = particleColor.replace(/[\d.]+\)$/, `${alpha})`);
        } else {
          // Fallback to white with alpha
          particleColor = `rgba(255, 255, 255, ${alpha})`;
        }
        
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw heat overlay if high with pulsing effect
      if (snapshot.heatRatio > 0.6) {
        const pulsePhase = (currentTime / 500) % 2;
        const pulseMod = Math.sin(pulsePhase * Math.PI) * 0.1;
        const baseAlpha = Math.min((snapshot.heatRatio - 0.6) * 1.5, 0.3);
        const alpha = baseAlpha + pulseMod;
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Cascading failure effect for critical heat
      if (snapshot.heatRatio > 0.9) {
        // Save current transform
        ctx.save();
        
        // Screen shake effect (subtle)
        const shakeIntensity = (snapshot.heatRatio - 0.9) * 10;
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(shakeX, shakeY);
        
        // Restore transform before drawing vignette
        ctx.restore();
        
        // Vignette effect
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw ghost building
      if (ghostPosition && selectedBuildingType) {
        const x = ghostPosition.x * TILE_SIZE;
        const y = ghostPosition.y * TILE_SIZE;

        // Check if position is valid
        const isOccupied = snapshot.buildings.some(
          (b) => b.x === ghostPosition.x && b.y === ghostPosition.y
        );

        // Draw ghost with transparency and pulse
        const pulsePhase = (currentTime / 300) % 2;
        const pulseAlpha = 0.4 + Math.sin(pulsePhase * Math.PI) * 0.2;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = isOccupied ? "#ef4444" : "#10b981";
        ctx.fillRect(x - 4, y - 4, 8, 8);

        // Draw dashed border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isOccupied ? "#ef4444" : "#10b981";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x - 8, y - 8, 16, 16);
        ctx.setLineDash([]);

        // Draw type label
        ctx.fillStyle = isOccupied ? "#ef4444" : "#10b981";
        ctx.font = "7px monospace";
        const label = selectedBuildingType.substring(0, 3).toUpperCase();
        ctx.fillText(label, x - 8, y - 6);
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [snapshot, selectedEntity, ghostPosition, selectedBuildingType]);

  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * TILE_SIZE}
          height={GRID_HEIGHT * TILE_SIZE}
          className={`border border-neutral-800 rounded-lg ${
            selectedBuildingType ? "cursor-crosshair" : "cursor-pointer"
          }`}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        />
        <PathDebugOverlay />
        {selectedBuildingType && (
          <div className="absolute top-4 left-4 bg-emerald-900/80 backdrop-blur px-3 py-2 rounded text-sm text-emerald-200">
            Placing: {selectedBuildingType}
          </div>
        )}
        <BuildingInfoPanel />
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur px-3 py-2 rounded text-xs text-neutral-400">
          <div className="mb-1 font-semibold text-neutral-300">Buildings:</div>
          <div>🟩 Core 🟦 Extractor 🟪 Assembler</div>
          <div>🟨 Fabricator 🟦 Cooler 🟫 Storage</div>
          <div>🟨 PowerVein 🩷 CoreCompiler</div>
          <div className="mt-2 mb-1 font-semibold text-neutral-300">Drones:</div>
          <div>🔵 Hauler 🟡 Builder 🟢 Maintainer</div>
        </div>
      </div>
    </div>
  );
}
