import { useMemo } from "react";

import { useGameStore } from "../../state/store";

interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

const deriveViewBox = (
  buildingsLength: number,
  dronesLength: number,
  positions: Array<{ x: number; y: number }>,
): ViewBox => {
  if (buildingsLength === 0 && dronesLength === 0) {
    return { minX: -50, minY: -50, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of positions) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: -50, minY: -50, width: 100, height: 100 };
  }

  // Increase margin and minimum view size to avoid extreme zoom when few
  // entities are clustered closely together. World units are small (2-unit
  // offsets between buildings), so a larger minimum keeps SVG units
  // proportional to on-screen pixels.
  const margin = 20;
  const width = Math.max(80, maxX - minX + margin * 2);
  const height = Math.max(80, maxY - minY + margin * 2);

  return {
    minX: minX - margin,
    minY: minY - margin,
    width,
    height,
  };
};

const buildingColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case "extractor":
      return "#38bdf8";
    case "assembler":
      return "#a855f7";
    case "fabricator":
      return "#f97316";
    case "cooler":
      return "#22d3ee";
    case "storage":
      return "#facc15";
    case "core":
      return "#f43f5e";
    default:
      return "#94a3b8";
  }
};

export const FactoryCanvas = () => {
  const snapshot = useGameStore((state) => state.uiSnapshot);

  const viewBox = useMemo(() => {
    const positions = [
      ...snapshot.buildings.map(({ x, y }) => ({ x, y })),
      ...snapshot.drones.map(({ x, y }) => ({ x, y })),
    ];

    return deriveViewBox(snapshot.buildings.length, snapshot.drones.length, positions);
  }, [snapshot.buildings, snapshot.drones]);

  return (
    <div className="absolute inset-0">
      <svg
        className="h-full w-full bg-slate-950"
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        role="img"
        aria-label="Factory grid"
      >
        <rect
          x={viewBox.minX}
          y={viewBox.minY}
          width={viewBox.width}
          height={viewBox.height}
          fill="#020617"
        />

        {snapshot.buildings.map((building) => (
          <g key={`building-${building.id}`}>
            {/* Draw buildings at a smaller, grid-friendly size (about 1.2 units)
                so they don't overlap when centers are ~2 units apart. */}
            <rect
              x={building.x - 0.6}
              y={building.y - 0.6}
              width={1.2}
              height={1.2}
              fill={buildingColor(building.type)}
              opacity={building.online === false ? 0.4 : 0.9}
              rx={0.25}
            />
            <text
              x={building.x}
              y={building.y + 1.2}
              fontSize={0.8}
              textAnchor="middle"
              fill="#cbd5f5"
            >
              {building.type}
            </text>
          </g>
        ))}

        {snapshot.drones.map((drone) => (
          <g key={`drone-${drone.id}`}>
            <circle cx={drone.x} cy={drone.y} r={0.4} fill="#38f8c9" />
            <text
              x={drone.x}
              y={drone.y - 0.8}
              fontSize={0.6}
              textAnchor="middle"
              fill="#bfdbfe"
            >
              {drone.role.charAt(0).toUpperCase()}
            </text>
            {drone.cargo && Object.keys(drone.cargo).length > 0 && (
              (() => {
                const entries = Object.entries(drone.cargo);
                const [res, amt] = entries[0];
                return (
                  <g>
                    <rect
                      x={drone.x - 0.6}
                      y={drone.y + 0.4}
                      width={1.2}
                      height={0.6}
                      rx={0.1}
                      fill="#111827"
                      opacity={0.8}
                    />
                    <text
                      x={drone.x}
                      y={drone.y + 0.8}
                      fontSize={0.5}
                      textAnchor="middle"
                      fill="#fef3c7"
                    >
                      {`${res}: ${amt}`}
                    </text>
                  </g>
                );
              })()
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
