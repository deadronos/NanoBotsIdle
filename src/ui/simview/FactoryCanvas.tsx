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

  const margin = 10;
  const width = Math.max(20, maxX - minX + margin * 2);
  const height = Math.max(20, maxY - minY + margin * 2);

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
            <rect
              x={building.x - 2.5}
              y={building.y - 2.5}
              width={5}
              height={5}
              fill={buildingColor(building.type)}
              opacity={building.online === false ? 0.4 : 0.9}
              rx={0.8}
            />
            <text
              x={building.x}
              y={building.y + 4}
              fontSize={2.2}
              textAnchor="middle"
              fill="#cbd5f5"
            >
              {building.type}
            </text>
          </g>
        ))}

        {snapshot.drones.map((drone) => (
          <g key={`drone-${drone.id}`}>
            <circle cx={drone.x} cy={drone.y} r={1.2} fill="#38f8c9" />
            <text
              x={drone.x}
              y={drone.y - 2}
              fontSize={1.8}
              textAnchor="middle"
              fill="#bfdbfe"
            >
              {drone.role.charAt(0).toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
